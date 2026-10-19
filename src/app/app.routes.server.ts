import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin-rankings/:rankingType',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => [
      { rankingType: 'investors' },
      { rankingType: 'instruments' },
    ],
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
