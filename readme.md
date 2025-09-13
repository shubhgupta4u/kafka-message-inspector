# KafkaInspector

KafkaInspector is a .NET 8 Web API application with an Angular frontend for inspecting Kafka messages. This project runs both the Angular SPA and the ASP.NET Core backend in a **single Docker container**.

---

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your machine.
- (Optional) [Node.js](https://nodejs.org/) if you want to build the Angular app locally.

---

## Docker Instructions

### 1. Build Docker Image

From the **solution root**:

```bash
docker build -t kafkainspector.full -f KafkaInspector.Server/Dockerfile .
```

### 2. Run Docker Container

```bash
docker run -d --name kafkainspector -p 32769:8080 kafkainspector.full
```

- `-d` → Run in detached mode  
- `--name kafkainspector` → Assign a container name  
- `-p 32769:8080` → Map **host port 32769** to **container port 8080**

---

## Access the Application

- **Angular SPA**:  
  [http://localhost:32769](http://localhost:32769)

- **Backend API Swagger UI**:  
  [http://localhost:32769/swagger/index.html](http://localhost:32769/swagger/index.html)

- **Backend API endpoints** (e.g., `WeatherForecast`):  
  ```
  http://localhost:32769/api/<controller>
  ```

---

## Notes

- The SPA and API run on the **same port**, so no CORS issues occur in production.  
- Any changes to the Angular frontend require rebuilding the Docker image.

---

## Stop and Remove Container

```bash
docker stop kafkainspector
docker rm kafkainspector
```

---

## License

This project is licensed under the MIT License.