FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p models/saved data
EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=10s --start-period=120s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"
CMD ["sh", "-c", "python training/train.py && uvicorn main:app --host 0.0.0.0 --port 8001"]
