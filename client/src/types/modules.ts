export type ModuleSlug = 'default' | 'jec' | 'familia' | 'criminal' | 'fazenda';

export interface Module {
    slug: ModuleSlug;
    name: string;
    shortName: string;
    description: string;
    icon: string;
    systemPrompt: string;
    isAvailable: boolean;
}
