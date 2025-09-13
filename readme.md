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

# Apache Kafka 2.13-2.8.0 on Windows 11

## Prerequisites

- **Java 8+** must be installed. Run:
  ```powershell
  java -version
  ```
  (Kafka 2.8.0 requires Java 8 or newer).

- Extract Kafka `kafka_2.13-2.8.0.tgz` into a folder, e.g. `D:\kafka-2.13-2.8.0`.

---

## 1. Edit server.properties to connect kafka broker using IP Address 

Open **server.properties** and replace <WINDOWS_HOST_IP> with your machine’s LAN or local IP (e.g., 192.168.1.100):

```notepad
# Listen on all interfaces
listeners=PLAINTEXT://0.0.0.0:9092

# Tell clients to connect via your host IP
advertised.listeners=PLAINTEXT://<WINDOWS_HOST_IP>:9092
```
---

## 2. Start Zookeeper

Kafka 2.8.0 still requires Zookeeper.

Open **Command Prompt / PowerShell** and run:

```powershell
cd D:\kafka-2.13-2.8.0
.\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties
```

This will start Zookeeper on port **2181**.

---

## 3. Start Kafka Broker

Open another terminal and run:

```powershell
cd D:\kafka-2.13-2.8.0
.\bin\windows\kafka-server-start.bat .\config\server.properties
```

This starts Kafka broker on port **9092**.

---

## 4. Create a Topic

Run:

```powershell
cd D:\kafka-2.13-2.8.0
.\bin\windows\kafka-topics.bat --create --topic test-topic --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

Verify topic exists:

```powershell
.\bin\windows\kafka-topics.bat --list --bootstrap-server localhost:9092
```

---

## 5. Start Producer (Publish Messages)

Run:

```powershell
cd D:\kafka-2.13-2.8.0
.\bin\windows\kafka-console-producer.bat --topic test-topic --bootstrap-server localhost:9092
```

Now type some messages in terminal → they’ll be sent to Kafka.

---

## License

This project is licensed under the MIT License.