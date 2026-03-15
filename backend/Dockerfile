FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies required by opencv/albumentations
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies (using --no-cache-dir to keep the image smaller)
# We specifically install the CPU-only version of PyTorch to save MASSIVE amounts of space and memory,
# as most cheap/free deployment servers do not have GPUs.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application using Gunicorn (production WSGI server)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "120", "app:app"]
