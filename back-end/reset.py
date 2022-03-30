from app import db, bcrypt, User, Level, Picture

db.drop_all()
db.create_all()
new_user = User(email="test@test.com",
                password=bcrypt.generate_password_hash("1234"))
db.session.add(new_user)

new_level = Level(name="First")

db.session.add(new_level)

for id in range(1):
    new_picture = Picture(
        path=f'static/assets/img{id}.jpeg', level=new_level)
    db.session.add(new_picture)

db.session.commit()
