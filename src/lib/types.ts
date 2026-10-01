export interface Personalizacion {
  id?: string;
  session_id: string;
  descripcion_negocio: string;
  industria: string;
  audiencia_objetivo: string;
  ejemplos_posts: string[];
  updated_at?: string;
}

export interface PostGenerado {
  id: string;
  session_id: string;
  idea: string;
  variaciones: number;
  posts: string[];
  created_at: string;
}
