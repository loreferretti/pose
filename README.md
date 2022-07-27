# pose

Inizializzazione progetto con git
```
<user>@<host>:~$ mkdir pose
<user>@<host>:~$ cd pose
<user>@<host>:~$ git init
<user>@<host>:~$ git remote add origin https://<ACCESS-TOKEN>@github.com/loreferretti/pose.git/
<user>@<host>:~$ git pull origin master
```

```
docker compose build
docker compose up
```
oppure se si vuole eseguire in modalità detach
```
docker compose up -d
```
La prima volta che si esegue il docker compose bisogna inizializzare il database chiamando lo script *reset.py*, dopodichè non andrà più chiamato
ammeno che non si voglia resettare
```
<user>@<host>:~$ docker container exec -it flask /bin/bash
root@<CONTAINER-ID>:/usr/src/app# python reset.py
...
root@<CONTAINER-ID>:/usr/src/app# exit
```
