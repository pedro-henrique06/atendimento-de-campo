using AtendimentoCampo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AtendimentoCampo.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Base> Bases => Set<Base>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Atendimento> Atendimentos => Set<Atendimento>();
    public DbSet<AtendimentoEtapa> AtendimentoEtapas => Set<AtendimentoEtapa>();
    public DbSet<HistoricoAlteracao> HistoricoAlteracoes => Set<HistoricoAlteracao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Base>(e =>
        {
            e.HasIndex(b => b.Nome);
        });

        modelBuilder.Entity<Usuario>(e =>
        {
            e.HasIndex(u => new { u.BaseId, u.Nome });
            e.HasOne(u => u.Base)
                .WithMany(b => b.Usuarios)
                .HasForeignKey(u => u.BaseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Atendimento>(e =>
        {
            e.HasIndex(a => a.Codigo).IsUnique();
            e.HasOne(a => a.Base)
                .WithMany(b => b.Atendimentos)
                .HasForeignKey(a => a.BaseId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.CriadoPorUsuario)
                .WithMany()
                .HasForeignKey(a => a.CriadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AtendimentoEtapa>(e =>
        {
            e.Property(x => x.DadosJson).HasColumnType("jsonb");
            e.HasOne(x => x.Atendimento)
                .WithMany(a => a.Etapas)
                .HasForeignKey(x => x.AtendimentoId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.UsuarioResponsavel)
                .WithMany()
                .HasForeignKey(x => x.UsuarioResponsavelId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<HistoricoAlteracao>(e =>
        {
            e.HasOne(h => h.Atendimento)
                .WithMany(a => a.Historico)
                .HasForeignKey(h => h.AtendimentoId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(h => h.Usuario)
                .WithMany()
                .HasForeignKey(h => h.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
