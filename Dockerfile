FROM python:3-slim

WORKDIR /usr/src/app

COPY requirements.txt  ./

RUN apt update
RUN apt install ffmpeg libsm6 libxext6  -y

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000 

COPY ./back-end . 

ENV FLASK_ENV=development
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

CMD ["flask", "run"]
