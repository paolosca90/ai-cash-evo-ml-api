// Global Deno type definitions for Supabase Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Extend global namespace
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

export {};

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  interface ServeInit {
    port?: number;
    hostname?: string;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: ServeInit
  ): Promise<void>;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
