using AtendimentoCampo.Api.Models;
using MongoDB.Driver;

namespace AtendimentoCampo.Api.Data;

public class MongoContext
{
    public IMongoDatabase Database { get; }

    public IMongoCollection<Base> Bases => Database.GetCollection<Base>("bases");
    public IMongoCollection<Usuario> Usuarios => Database.GetCollection<Usuario>("usuarios");
    public IMongoCollection<Atendimento> Atendimentos => Database.GetCollection<Atendimento>("atendimentos");

    public MongoContext(IConfiguration config)
    {
        var connectionString = Environment.GetEnvironmentVariable("MONGO_URL")
            ?? Environment.GetEnvironmentVariable("MONGODB_URI")
            ?? config["Mongo:ConnectionString"]
            ?? throw new InvalidOperationException("Connection string do MongoDB não configurada (MONGO_URL).");

        var databaseName = Environment.GetEnvironmentVariable("MONGO_DATABASE")
            ?? config["Mongo:Database"]
            ?? "atendimento_campo";

        var client = new MongoClient(connectionString);
        Database = client.GetDatabase(databaseName);
    }

    public async Task CriarIndicesAsync()
    {
        await Atendimentos.Indexes.CreateOneAsync(new CreateIndexModel<Atendimento>(
            Builders<Atendimento>.IndexKeys.Ascending(a => a.Codigo), new CreateIndexOptions { Unique = true }));

        await Atendimentos.Indexes.CreateOneAsync(new CreateIndexModel<Atendimento>(
            Builders<Atendimento>.IndexKeys.Ascending(a => a.BaseId).Descending(a => a.CriadoEm)));

        await Usuarios.Indexes.CreateOneAsync(new CreateIndexModel<Usuario>(
            Builders<Usuario>.IndexKeys.Ascending(u => u.BaseId).Ascending(u => u.Nome)));
    }
}
