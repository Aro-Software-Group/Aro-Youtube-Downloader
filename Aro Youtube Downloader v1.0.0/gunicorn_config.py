import os
import gunicorn

# Gunicorn設定
bind = "0.0.0.0:8080"
workers = 4
timeout = 120
accesslog = "-"
errorlog = "-"
loglevel = "info"

# アプリケーション設定
app_dir = os.path.dirname(os.path.abspath(__file__))
pythonpath = app_dir
