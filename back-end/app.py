import cv2
import numpy as np
from datetime import timedelta
import uuid
from flask import Flask
from flask import jsonify
from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import UserMixin, LoginManager, current_user, login_user, logout_user, login_required
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, send, emit


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="https://strikeapose.it")
cors = CORS(app, resources={r"/api/*": {"origins": "https://strikeapose.it"}})
bcrypt = Bcrypt(app)

app.config["SERVER_NAME"] = "strikeapose.it"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "thisisasecretkey"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(id):
    return User.query.get(id)


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

class Room:
    def __init__(self, id):
        self.id = id
        self.clients = []
        self.num_clients = 0
        self.free = True

    def to_string(self):
        return {"id":self.id, "clients":self.clients, "num_clients":self.num_clients, "free":self.free}


@app.route("/api/v1/login", methods=["POST"])
def login():
    email = request.json.get("email", None)
    password = request.json.get("password", None)

    user = User.query.filter_by(email=email).one_or_none()
    if not user or not user.check_password(password):
        return jsonify("Wrong username or password"), 401
    login_user(user)
    return jsonify(f"{user.email} successfully logged in")


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
@login_required
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

@app.route("/api/v1/videos/<id>", methods=["GET"])
def get_video(id):
    video = Video.query.get(int(id))
    return jsonify(video.as_dict())

room = Room(0)

@app.route("/api/v1/join/room", methods=["POST"])
@login_required
def get_room():
    n_round = request.json.get("n_round", None)
    n_pose = request.json.get("n_pose", None)
    return room.to_string() if room.free else jsonify("there aren't any rooms available")

@app.route("/api/v1/logout", methods=["POST"])
@login_required
def log_out():
    user = current_user
    logout_user()
    return jsonify(f"{user.email} successfully logged out")

@socketio.on("connect")
def connect():
    emit("status", { "data": "connection established!" });


@socketio.on("join")
@login_required
def on_join():
    user = current_user
    if user.email in room.clients:
        send(f"{user.email} has already in the room")
        send(f"room {room.id}: {room.to_string()}")
        return

    if room.num_clients == 2:
        room.free = False
        send("sorry, room is full")
        return

    join_room(room.id)
    room.clients.append(user.email)
    room.num_clients += 1
    emit("room_message", f"Welcome to room {room.id}, number of clients connected: {room.num_clients}, clients connected: {room.clients}", to=room.id)

@socketio.on("leave")
@login_required
def on_leave():
    user = current_user
    leave_room(room.id)
    room.clients.remove(user.email)
    room.num_clients -= 1
    if room.num_clients == 0:
        room.free = True
    emit("room_message", f"Bye {current_user.email} from room {room.id}", to=room.id)
    send(f"{room.to_string()}")
    return

