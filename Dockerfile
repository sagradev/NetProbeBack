# Stage 1: build com Maven
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copia o pom.xml separado para cachear dependências entre builds
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copia o código e compila
COPY src ./src
RUN mvn package -DskipTests -q

# Stage 2: imagem de runtime mínima (JRE, não JDK)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
