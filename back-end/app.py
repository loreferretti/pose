from flask import Flask
from flask import jsonify
from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import UserMixin, current_user
from flask_cors import CORS

from flask_jwt_extended import create_access_token
from flask_jwt_extended import current_user
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager


app = Flask(__name__)
CORS(app)
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SECRET_KEY'] = 'thisisasecretkey'

jwt = JWTManager(app)
db = SQLAlchemy(app)


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    # NOTE: In a real application make sure to properly hash and salt passwords
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    def as_dict(self):
        return {"id": self.id, "email": self.email}


class Level(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    pictures = db.relationship('Picture', backref='level', lazy=True)

    def as_dict(self):
        print(self.pictures)
        return {"id": self.id, "name": self.name, "picture_ids": [p.id for p in self.pictures]}


class Picture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)
    level_id = db.Column(db.Integer, db.ForeignKey('level.id'),
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


@app.route("/user/me", methods=["GET"])
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
