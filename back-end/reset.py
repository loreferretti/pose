import os
import shutil
from app import db, bcrypt, User, Level, Picture

db.drop_all()
folder = 'static/videos'
for filename in os.listdir(folder):
    file_path = os.path.join(folder, filename)
    try:
        if os.path.isfile(file_path) or os.path.islink(file_path):
            os.unlink(file_path)
        elif os.path.isdir(file_path):
            shutil.rmtree(file_path)
    except Exception as e:
        print('Failed to delete %s. Reason: %s' % (file_path, e))
db.create_all()
new_user = User(email="test@test.com",
                password=bcrypt.generate_password_hash("1234"))
db.session.add(new_user)

new_level = Level(name="First")

db.session.add(new_level)

for id in range(3):
    new_picture = Picture(
        path=f'static/assets/img{id}.jpeg', level=new_level)
    db.session.add(new_picture)

db.session.commit()
