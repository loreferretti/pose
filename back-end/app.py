import cv2
import numpy as np
from datetime import timedelta
import uuid
from flask import Flask
from flask import jsonify
from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import UserMixin, current_user
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, send, emit

from flask_jwt_extended import create_access_token
from flask_jwt_extended import current_user
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="https://strikeapose.it")
cors = CORS(app, resources={r"/api/*": {"origins": "https://strikeapose.it"}})
bcrypt = Bcrypt(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'thisisasecretkey'
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)

jwt = JWTManager(app)
db = SQLAlchemy(app)


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    videos = db.relationship('Video', backref='user', lazy=True)

    # NOTE: In a real application make sure to properly hash and salt passwords
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    def as_dict(self):
        return {"id": self.id, "email": self.email}


class Level(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255))
    pictures = db.relationship('Picture', backref='level', lazy=True)

    def as_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description, "picture_ids": [p.id for p in self.pictures]}


class Picture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)
    level_id = db.Column(db.Integer, db.ForeignKey('level.id'),
                         nullable=False)

    def as_dict(self):
        return {"id": self.id, "path": self.path}


class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'),
                        nullable=False)

    def as_dict(self):
        return {"id": self.id, "path": self.path}


# Register a callback function that takes whatever object is passed in as the
# identity when creating JWTs and converts it to a JSON serializable format.
@jwt.user_identity_loader
def user_identity_lookup(user):
    return user.id


# Register a callback function that loads a user from your database whenever
# a protected route is accessed. This should return any python object on a
# successful lookup, or None if the lookup failed for any reason (for example
# if the user has been deleted from the database).
@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    return User.query.filter_by(id=identity).one_or_none()


@app.route("/api/v1/login", methods=["POST"])
def login():
    email = request.json.get("email", None)
    password = request.json.get("password", None)

    user = User.query.filter_by(email=email).one_or_none()
    if not user or not user.check_password(password):
        return jsonify("Wrong username or password"), 401

    # Notice that we are passing in the actual sqlalchemy user object here
    access_token = create_access_token(identity=user)
    return jsonify(access_token=access_token)


@app.route("/", methods=["GET"])
def root():
    return jsonify("Hello World from Flask!")


@app.route("/api/v1/signup", methods=["POST"])
def signup():
    email = request.json.get("email", None)
    password = request.json.get("password", None)
    hashed_password = bcrypt.generate_password_hash(password)
    new_user = User(email=email, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.as_dict())


@app.route("/api/v1/user/me", methods=["GET"])
@jwt_required()
def user_me():
    # We can now access our sqlalchemy User object via `current_user`.
    return jsonify(
        current_user.as_dict()
    )


@app.route("/api/v1/pictures/", methods=["POST"])
def post_picture():
    path = request.json.get("path", None)
    new_picture = Picture(path=path)
    db.session.add(new_picture)
    db.session.commit()
    return jsonify(new_picture.as_dict())


@app.route("/api/v1/pictures/<id>", methods=["GET"])
def get_picture(id):
    picture = Picture.query.get(int(id))
    return jsonify(picture.as_dict())


@app.route("/api/v1/levels/<id>", methods=["GET"])
def get_level(id):
    level = Level.query.get(int(id))
    return jsonify(level.as_dict())


@app.route("/api/v1/levels", methods=["GET"])
def get_levels():
    levels = Level.query.all()
    return jsonify([level.as_dict() for level in levels])


@app.route("/api/v1/videos", methods=["POST"])
@jwt_required()
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

@app.route("/api/v1/videos/<id>", methods=["GET"])
def get_video(id):
    video = Video.query.get(int(id))
    return jsonify(video.as_dict())


room_1 = {"id":"1", "num_clients":0, "status":"free"}
room_2 = {"id":"2", "num_clients":0, "status":"free"}
rooms = [room_1, room_2]

@app.route("/api/v1/join/room", methods=["POST"])
def get_room():
    n_round = request.json.get("n_round", None)
    n_pose = request.json.get("n_pose", None)
    for room in rooms:
        if room["status"] == "free":
            #room["status"] = "busy"
            return room 
    return {"message":"there aren't any rooms available"}   

'''           
@app.route("/api/v1/join/room/<id>", methods=["GET"])
def join_room(data):
    on_join(data)


@app.route("/api/v1/leave/room/<id>", methods=["GET"])
def leave_room(data):
    on_leave(data)
'''


@socketio.on("connect")
def connect():
    emit("status", { "data": "connection established!" });


@socketio.on("join")
@jwt_required() 
def on_join(data):
    for room in rooms:
        if room == data:
            break
    send(f"user: {current_user.as_dict()}")
    join_room(room["id"])
    if room["num_clients"] <= 1:
        room["num_clients"] += 1
        emit("room_message", f"Welcome to room {room['id']}, number of clients connected: {room['num_clients']}", to=room["id"])
    else:
        status = "busy"
        emit("room_message", f"Sorry, room {room['id']} is full", to=room["id"])
'''
def on_join(data):
    username = data["username"]
    room = data["room"]
    join_room(room)
    emit("room_message", f"Welcome {username} to {room}", to=room)
'''


@socketio.on("leave")
def on_leave(data):
    for room in rooms:
        if room == data:
            break
    leave_room(room["id"])
    room["num_clients"] -= 1
    if room["num_clients"] == 0:
        status = "free"
    emit("room_message", f"Bye from room {data.id}", to=id)
'''
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    emit("room_message", f"Bye {username} from {room}", to=room)
'''

