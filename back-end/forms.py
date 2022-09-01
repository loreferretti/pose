from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField
from wtforms.validators import DataRequired, Email

class RegistrationForm(FlaskForm):
    email = StringField("Email", validators = [DataRequired("Email is required"), Email("Wrong email syntaxt")])
    password = PasswordField("Password", validators=[DataRequired("Password is required")])
    submit = SubmitField("Signup")

class LoginForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired("Email is required"), Email("Wrong email syntaxt")])
    password = PasswordField("Password", validators=[DataRequired("Password is required")])
    submit = SubmitField("Login")

class CreateRoomForm(FlaskForm):
    choices_n_pose = [
        (1,"Uno"),
        (2, "Due"),
        (3, "Tre"),
        (4, "Quattro"),
        (5, "Cinque"),
        (6,"Sei")
    ]

    choices_n_round = [
        (1,"Uno"),
        (2, "Due"),
        (3, "Tre")
    ]
    n_round = SelectField("Scegli il numero di round", choices=choices_n_round, validators=[DataRequired("Round number is required")])
    n_pose = SelectField("Scegli il numero di pose", choices=choices_n_pose, validators=[DataRequired("Pose number is required")])
    submit = SubmitField("CREATE ROOM")

class JoinRoomForm(FlaskForm):
    room_id = StringField("Room ID", validators=[DataRequired("Room ID is required")])
    submit = SubmitField("ENTER")