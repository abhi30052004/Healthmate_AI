FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system libraries needed by PyMuPDF, OpenCV, ONNX, and Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Ensure storage directory exists and start script is executable
RUN mkdir -p /app/private_uploads && \
    chmod +x /app/start.sh

# Expose default port (Render will inject PORT at runtime)
EXPOSE 8000

# Execute entrypoint
CMD ["/app/start.sh"]
