# ================================
# Stage 1: Build Angular client
# ================================
FROM node:20 AS client-build
WORKDIR /src/client

# Copy Angular package files & install dependencies
COPY ../kafkainspector.client/package*.json ./
RUN npm install --legacy-peer-deps

# Copy Angular source code
COPY ../kafkainspector.client/ ./

# Build Angular for production
RUN npm run build -- --output-path=dist --configuration=production

# ================================
# Stage 2: Build ASP.NET Core server
# ================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS server-build
WORKDIR /src/server

# Copy csproj and restore as distinct layers
COPY ../KafkaInspector.Server/*.csproj ./
RUN dotnet restore

# Copy the rest of server source
COPY ../KafkaInspector.Server/. ./

# Copy Angular build output into wwwroot
COPY --from=client-build /src/client/dist/browser ./wwwroot

# Publish app
#RUN dotnet publish "KafkaInspector.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

#WORKDIR /src/server
RUN dotnet build "KafkaInspector.Server.csproj" -c Release -o /app/build

# This stage is used to publish the service project to be copied to the final stage
#FROM build AS publish
#ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "KafkaInspector.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ================================
# Stage 3: Final runtime
# ================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published app from server-build
COPY --from=server-build /app/publish .

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["dotnet", "KafkaInspector.Server.dll"]
