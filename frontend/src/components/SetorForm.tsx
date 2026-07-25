import type { CampoFormulario } from '../config/setores';

interface Props {
  campos: CampoFormulario[];
  valores: Record<string, unknown>;
  onChange: (chave: string, valor: unknown) => void;
  desabilitado?: boolean;
}

function campoVisivel(campo: CampoFormulario, valores: Record<string, unknown>): boolean {
  if (!campo.dependeDe) return true;
  const valorDependencia = valores[campo.dependeDe];
  if (Array.isArray(valorDependencia)) return valorDependencia.includes(campo.dependeValor);
  return valorDependencia === campo.dependeValor;
}

export function SetorForm({ campos, valores, onChange, desabilitado }: Props) {
  return (
    <div className="space-y-4">
      {campos.filter((campo) => campoVisivel(campo, valores)).map((campo) => (
        <div key={campo.chave}>
          <label className="label">
            {campo.rotulo}
            {campo.obrigatorio && <span className="text-risco-vermelho"> *</span>}
          </label>

          {campo.tipo === 'texto' && (
            <input
              className="input"
              value={(valores[campo.chave] as string) ?? ''}
              disabled={desabilitado}
              onChange={(e) => onChange(campo.chave, e.target.value)}
            />
          )}

          {campo.tipo === 'texto-longo' && (
            <textarea
              className="input min-h-[90px]"
              value={(valores[campo.chave] as string) ?? ''}
              disabled={desabilitado}
              onChange={(e) => onChange(campo.chave, e.target.value)}
            />
          )}

          {campo.tipo === 'numero' && (
            <input
              type="number"
              className="input"
              value={(valores[campo.chave] as string) ?? ''}
              disabled={desabilitado}
              onChange={(e) => onChange(campo.chave, e.target.value)}
            />
          )}

          {campo.tipo === 'selecao' && (
            <select
              className="input"
              value={(valores[campo.chave] as string) ?? ''}
              disabled={desabilitado}
              onChange={(e) => onChange(campo.chave, e.target.value)}
            >
              <option value="">Selecione…</option>
              {campo.opcoes?.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
          )}

          {campo.tipo === 'multi-selecao' && (
            <div className="flex flex-wrap gap-2">
              {campo.opcoes?.map((opcao) => {
                const selecionados = (valores[campo.chave] as string[]) ?? [];
                const ativo = selecionados.includes(opcao);
                return (
                  <button
                    type="button"
                    key={opcao}
                    disabled={desabilitado}
                    onClick={() =>
                      onChange(
                        campo.chave,
                        ativo ? selecionados.filter((v) => v !== opcao) : [...selecionados, opcao],
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      ativo
                        ? 'bg-base-teal border-base-teal text-white'
                        : 'border-base-border text-slate-300 hover:border-base-teal'
                    }`}
                  >
                    {opcao}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
