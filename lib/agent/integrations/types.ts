export type ActionFn = (params?: Record<string, any>) => Promise<unknown>

export interface ActionManifest {
  description: string
  params: Record<string, string>
}

export interface IntegrationManifest {
  key: string
  label: string
  description: string
  docsUrl: string
  actions: Record<string, ActionManifest>
}

export interface IntegrationModule {
  manifest: IntegrationManifest
  actions: Record<string, ActionFn>
}
