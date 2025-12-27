/**
 * DEPRECATED: Manus/Forge Data API
 * 
 * Este módulo foi desabilitado pois dependia da infraestrutura Manus/Forge.
 * As funcionalidades anteriormente fornecidas por este módulo (YouTube search, etc)
 * podem ser implementadas diretamente usando as APIs dos respectivos serviços.
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  throw new Error(
    `Data API não disponível. A integração com Manus/Forge foi removida. ` +
    `Para usar a API "${apiId}", implemente uma integração direta com o serviço.`
  );
}
