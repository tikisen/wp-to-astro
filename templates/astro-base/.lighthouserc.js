export default {
  ci: {
    collect: { url: ['http://localhost:4321/'], startServerCommand: 'npm run preview', startServerReadyPattern: 'preview' },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.80 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.90 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
