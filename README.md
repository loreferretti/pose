# pose

<!---
Inizializzazione progetto con git
```
<user>@<host>:~$ mkdir pose
<user>@<host>:~$ cd pose
<user>@<host>:~$ git init
<user>@<host>:~$ git remote add origin https://<ACCESS-TOKEN>@github.com/loreferretti/pose.git/
<user>@<host>:~$ git pull origin master
```
--->

E' necessario aggiungere la seguente riga nel file hosts del computer dove sono in esecuzione i container docker:
```
# Added by us for PPM project
127.0.0.1 strikeapose.it
# End
```
mentre nei computer che vogliono usufruire del servizio (computer nella stessa rete ma non lo stesso che ha i container docker):
```
# Added by us for PPM project
<SERVER_IP> strikeapose.it
# End
```
**<SERVER_IP>** è l'indirizzo ip del computer che ha in esecuzione i container docker

Nei sistemi **Windows** il file si trova nella cartella *C:\Windows\System32\drivers\etc*, mentre nei sistemi **Linux** nella cartella */etc*
Eseguire il file docker compose:

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
Per aggiungere o rimuovere (in questo caso partire da punto 3) immagini:

1. Scaricare immagine contenente una posa a mezzo busto o a busto intero

2. Rinominare l'immagine con il formato *\<nome opera\>-\<nome autore\>\.\<formato\>*
   Mettendo al posto degli spazi il carattere _ (es. Mona_Lisa-Leonardo_da_Vinci.jpeg)

3. Inserire/Rimuovere l'immagine nella/dalla cartella apposita (cartella halfBust per posa a mezzo busto e fullLength per posa a busto intero) che si trova in
   pose/back-end/static/assets/

4. Eseguire il file python resetPictures.py o reset.py (ma in questo caso vengono eliminati anche gli utenti), per farlo:
	* Dopo aver eseguito il docker compose up, da un altro terminale eseguire
    ```
    <user>@<host>:~$ docker container exec -it flask /bin/bash
    root@<CONTAINER-ID>:/usr/src/app# python resetPictures.py
    ...
    root@<CONTAINER-ID>:/usr/src/app# exit
     ```
Per attivare lo scheletro settare la variabile *DEBUG* a true nel file *back-end/static/js/scripts/config.js*
```
static DEBUG = true;
```
