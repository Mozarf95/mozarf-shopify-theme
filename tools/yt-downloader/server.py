"""Mini serveur perso : reçoit un lien de playlist, renvoie un ZIP. Usage: python server.py"""
import os, shutil, tempfile, re
from flask import Flask, request, send_file, Response
from flask_cors import CORS
import yt_dlp

TOKEN = os.environ.get("YTD_TOKEN", "")  # optionnel
app = Flask(__name__)
CORS(app)

@app.post("/download")
def download():
    if TOKEN and request.headers.get("X-Token") != TOKEN:
        return Response("Non autorisé", 401)
    data = request.get_json(force=True)
    url, fmt = data.get("url", ""), data.get("format", "mp3")
    if not re.match(r"^https?://(www\.|music\.)?(youtube\.com|youtu\.be)/", url):
        return Response("Lien invalide", 400)
    tmp = tempfile.mkdtemp()
    opts = {"outtmpl": f"{tmp}/%(playlist_index)s - %(title)s.%(ext)s", "quiet": True}
    if fmt == "mp3":
        opts.update(format="bestaudio/best", postprocessors=[
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}])
    else:
        opts.update(format="bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best")
    try:
        with yt_dlp.YoutubeDL(opts) as y:
            y.download([url])
        zpath = shutil.make_archive(os.path.join(tempfile.gettempdir(), "playlist"), "zip", tmp)
        return send_file(zpath, as_attachment=True, download_name="playlist.zip")
    except Exception as e:
        return Response(str(e), 500)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
