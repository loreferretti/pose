import os
import shutil
import random
from app import bcrypt
from models import db, User, Level, Picture

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

new_level = Level(name="Half bust",
                  description="Match the poses of some artworks. You'll find only half bust figures.")
db.session.add(new_level)
for id in [15, 16, 17, 19]:
    new_picture = Picture(
        path=f'static/assets/halfBust/img{id}.jpeg', level=new_level)
    db.session.add(new_picture)

new_level = Level(
    name="Full length", description="Match the poses of some artworks. You'll find only full length figures.")
db.session.add(new_level)
for id in [11, 12, 13, 14, 10, 20]:
    new_picture = Picture(
        path=f'static/assets/fullLength/img{id}.jpeg', level=new_level)
    db.session.add(new_picture)

new_level = Level(
    name="Both", description="Match the poses of some artworks. You'll find full length and half bust figures.")
db.session.add(new_level)
for id in [15, 12, 16, 13, 17, 10, 19, 20]:
    if id in [15, 16, 17, 18, 19]:
        new_picture = Picture(
            path=f'static/assets/halfBust/img{id}.jpeg', level=new_level)
    else:
        new_picture = Picture(
            path=f'static/assets/fullLength/img{id}.jpeg', level=new_level)
    db.session.add(new_picture)


db.session.commit()
