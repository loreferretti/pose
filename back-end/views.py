import cv2
import numpy as np
import uuid
from random import randrange
from flask import jsonify, request, render_template, redirect, url_for, session
from flask_login import LoginManager, current_user, login_user, logout_user, login_required
from flask_socketio import join_room, leave_room, send, emit

from app import app
from models import *
from forms import *

from sqlalchemy import exc

login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(id):
    return User.query.get(id)

@app.route("/", methods=["GET"])
def index():
    form = LoginForm()
    return render_template("index.html", form=form)

@app.route("/login", methods=["POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        user = User.query.filter_by(email=email).one_or_none()
        if not user or not user.check_password(password):
            error = "Wrong username or password"
            return render_template("index.html", form=form, error=error)
        login_user(user)
        return redirect(url_for("start"))

@app.route("/signup", methods=["GET"])
def index_signup():
    form = RegistrationForm()
    return render_template("index.html", form=form)


@app.route("/signup", methods=["POST"])
def signup():
    form = RegistrationForm()
    if form.validate_on_submit:
        email = form.email.data
        password = form.password.data
        hashed_password = bcrypt.generate_password_hash(password)
        try:
            new_user = User(email=email, password=hashed_password)
            db.session.add(new_user)
            db.session.commit()
        except exc.IntegrityError as ex:
            if "UNIQUE" in str(ex):
                error = "This email is already use !"
            db.session.rollback()
            return render_template("index.html", form=form, error=error)
        return render_template("index.html", form=LoginForm())

@app.route("/start", methods=["GET"])
@login_required
def start():
    try:
        room_id = session.pop("room_id")
    except:
        return render_template("start.html", form=CreateRoomForm(), join_form=JoinRoomForm(), levels=Level.query.all())
    return render_template("start.html", form=CreateRoomForm(), join_form=JoinRoomForm(), levels=Level.query.all(), room=room_id )

rooms = []

@app.route("/start", methods=["POST"])
@login_required
def start_post():
    form = CreateRoomForm()
    if form.validate_on_submit():
        id = randrange(1000000)
        exist = next((x for x in rooms if x.id == id), None)
        while exist is not None:
            id = randrange(1000000)
            exist = next((x for x in rooms if x.id == id), None)
        n_round = int(form.n_round.data)
        n_pose = int(form.n_pose.data)
        my_room = Room(id,n_pose,n_round)
        rooms.append(my_room)
        session["room_id"] = my_room.id
        return redirect(url_for("start"))
    return render_template("start.html", form=form, join_form=JoinRoomForm(), levels=Level.query.all())

@app.route("/join/<id>", methods=["GET"])
@login_required
def join(id):
    my_room = next((x for x in rooms if x.id == int(id)), None)
    if my_room is None:
        return jsonify("This room doesn't exists")
    else:
        return jsonify(my_room.to_string())

@app.route("/room/<id>", methods=["POST"])
@login_required
def room(id):
    level = request.json.get("level", None)
    n = request.json.get("n", None)
    my_room = next((x for x in rooms if x.id == int(id)), None)
    my_room.level = level
    my_room.n = n
    return jsonify(my_room.to_string())

@app.route("/game", methods=["GET"])
@login_required
def game():
    id = request.args.get("id")
    mode = request.args.get("mode")
    return render_template("game.html", id=id, mode=mode)

@app.route("/user/me", methods=["GET"])
@login_required
def user_me():
    # We can now access our sqlalchemy User object via `current_user`.
    return jsonify(
        current_user.as_dict()
    )


@app.route("/pictures/", methods=["POST"])
def post_picture():
    path = request.json.get("path", None)
    new_picture = Picture(path=path)
    db.session.add(new_picture)
    db.session.commit()
    return jsonify(new_picture.as_dict())


@app.route("/pictures/<id>", methods=["GET"])
def get_picture(id):
    picture = Picture.query.get(int(id))
    return jsonify(picture.as_dict())


@app.route("/levels/<id>", methods=["GET"])
def get_level(id):
    level = Level.query.get(int(id))
    return jsonify(level.as_dict())


@app.route("/levels", methods=["GET"])
def get_levels():
    levels = Level.query.all()
    return jsonify([level.as_dict() for level in levels])


@app.route("/videos", methods=["POST"])
@login_required
def post_video():
    video_path = f'static/videos/{uuid.uuid4()}.mp4'
    out = cv2.VideoWriter(video_path,
                          cv2.VideoWriter_fourcc(*'mp4v'), 14.0, (1024, 2048))

    for picture_id in request.form.getlist('picture_ids[]'):
        picture = Picture.query.get(int(picture_id))
        picture_image = cv2.imread(picture.path)
        for file in request.files.getlist(f'frames_{picture_id}[]'):
            img = cv2.imdecode(np.fromstring(
                file.read(), np.uint8), cv2.IMREAD_COLOR)
            resized_picure_image = cv2.resize(picture_image, (1024, 1024))
            resized_image = cv2.resize(img, (1024, 1024))
            combined_images = np.concatenate(
                (resized_picure_image, resized_image), axis=0)
            flipped_combined_images = cv2.flip(combined_images, 1)
            out.write(flipped_combined_images)

    out.release()
    new_video = Video(path=video_path, user_id=current_user.id)
    db.session.add(new_video)
    db.session.commit()
    return jsonify(new_video.as_dict())

@app.route("/videos/<id>", methods=["GET"])
def get_video(id):
    video = Video.query.get(int(id))
    return jsonify(video.as_dict())

@app.route("/end", methods=["GET"])
@login_required
def end():
    id = request.args.get("id")
    winner = request.args.get("winner")
    return render_template("end.html", id=id, winner=winner)

@app.route("/logout", methods=["GET"])
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))

@socketio.on("connect")
def connect():
    emit("status", { "data": "connection established!" });


@socketio.on("join")
@login_required
def on_join(room_id):
    user = current_user
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    
    if my_room is None:
        send(f"room {room_id}: doesn't exist")
        return 

    if user.email in my_room.clients:
        send(f"{user.email} has already in the room")
        send(f"room {my_room.id}: {my_room.to_string()}")
        return 

    if my_room.num_clients == 2:
        my_room.free = False
        send("sorry, room is full")
        return


    join_room(my_room.id)
    my_room.clients.append(user.email)
    my_room.num_clients += 1
    emit("room_message", f"Welcome to room {my_room.id}, number of clients connected: {my_room.num_clients}, clients connected: {my_room.clients}", to=my_room.id)
    
    if my_room.num_clients == 2:
        emit("play", "PLAY!", to=my_room.id)

@socketio.on("leave")
@login_required
def on_leave(room_id):
    send("CIAO")
    user = current_user
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    leave_room(my_room.id)
    my_room.clients.remove(user.email)
    my_room.num_clients -= 1
    if my_room.num_clients == 0:
        my_room.free = True
    emit("leave_message", f"Bye {current_user.email} from room {my_room.id}")
    send(f"{my_room.to_string()}")
    return