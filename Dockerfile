FROM python:3-slim

WORKDIR /usr/src/app

ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

COPY requirements.txt  ./

RUN apt update
RUN apt install ffmpeg libsm6 libxext6  -y

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000 

COPY . . 

CMD ["flask", "run"]
