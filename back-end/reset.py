from app import db, bcrypt, User, Picture

db.drop_all()
db.create_all()
new_user = User(email="test@test.com",
                password=bcrypt.generate_password_hash("1234"))
db.session.add(new_user)

for id in range(11):
    new_picture = Picture(path=f'static/assets/img{id}.jpeg')
    db.session.add(new_picture)

db.session.commit()
