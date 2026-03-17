FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["UpzIt.Api.csproj", "."]
RUN dotnet restore "UpzIt.Api.csproj"
COPY . .
RUN dotnet build "UpzIt.Api.csproj" -c Release -o /app/build
RUN dotnet publish "UpzIt.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "UpzIt.Api.dll"]
