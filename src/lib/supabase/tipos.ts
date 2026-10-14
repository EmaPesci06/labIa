
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "barrios": {
                  Row: {
                    "centro": unknown,"id": number,"nombre": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "centro": unknown,"id": number,"nombre": string,"slug": string
                  }
                  Update: {
                    "centro"?: unknown,"id"?: number,"nombre"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"contactos": {
                  Row: {
                    "cliente_id": string,"created_at": string,"id": string,"origen": string,"profesional_id": string,"trabajo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"created_at"?: string,"id"?: string,"origen": string,"profesional_id": string,"trabajo_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string,"created_at"?: string,"id"?: string,"origen"?: string,"profesional_id"?: string,"trabajo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contactos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contactos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contactos_profesional_id_fkey"
      columns: ["profesional_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contactos_profesional_id_fkey"
      columns: ["profesional_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contactos_trabajo_id_fkey"
      columns: ["trabajo_id"]
isOneToOne: false
      referencedRelation: "trabajos"
      referencedColumns: ["id"]
    }
                  ]
                },"emails_enviados": {
                  Row: {
                    "clave": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clave": string,"created_at"?: string
                  }
                  Update: {
                    "clave"?: string,"created_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"emails_pendientes": {
                  Row: {
                    "created_at": string,"enviado_at": string | null,"id": string,"postulacion_id": string,"trabajo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"enviado_at"?: string | null,"id"?: string,"postulacion_id": string,"trabajo_id": string
                  }
                  Update: {
                    "created_at"?: string,"enviado_at"?: string | null,"id"?: string,"postulacion_id"?: string,"trabajo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "emails_pendientes_postulacion_id_fkey"
      columns: ["postulacion_id"]
isOneToOne: true
      referencedRelation: "postulaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "emails_pendientes_trabajo_id_fkey"
      columns: ["trabajo_id"]
isOneToOne: false
      referencedRelation: "trabajos"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles_profesionales": {
                  Row: {
                    "anios_experiencia": number | null,"antecedentes_ok": boolean,"cantidad_resenas": number,"created_at": string,"descripcion": string | null,"disponibilidad": string | null,"especialidades": string | null,"fotos_trabajos": (string)[],"identidad_verificada": boolean,"matricula_numero": string | null,"matriculado": boolean,"oficios": (Database["public"]['Enums']["oficio"])[],"prioridad": number,"promedio": number | null,"publicado": boolean,"toda_la_ciudad": boolean,"updated_at": string,"usuario_id": string,"zonas": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "anios_experiencia"?: number | null,"antecedentes_ok"?: boolean,"cantidad_resenas"?: number,"created_at"?: string,"descripcion"?: string | null,"disponibilidad"?: string | null,"especialidades"?: string | null,"fotos_trabajos"?: (string)[],"identidad_verificada"?: boolean,"matricula_numero"?: string | null,"matriculado"?: boolean,"oficios": (Database["public"]['Enums']["oficio"])[],"prioridad"?: number,"promedio"?: number | null,"publicado"?: boolean,"toda_la_ciudad"?: boolean,"updated_at"?: string,"usuario_id": string,"zonas"?: (number)[]
                  }
                  Update: {
                    "anios_experiencia"?: number | null,"antecedentes_ok"?: boolean,"cantidad_resenas"?: number,"created_at"?: string,"descripcion"?: string | null,"disponibilidad"?: string | null,"especialidades"?: string | null,"fotos_trabajos"?: (string)[],"identidad_verificada"?: boolean,"matricula_numero"?: string | null,"matriculado"?: boolean,"oficios"?: (Database["public"]['Enums']["oficio"])[],"prioridad"?: number,"promedio"?: number | null,"publicado"?: boolean,"toda_la_ciudad"?: boolean,"updated_at"?: string,"usuario_id"?: string,"zonas"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfiles_profesionales_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: true
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "perfiles_profesionales_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: true
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    }
                  ]
                },"postulaciones": {
                  Row: {
                    "created_at": string,"estado": Database["public"]['Enums']["estado_postulacion"],"id": string,"mensaje": string,"precio_estimado": number | null,"profesional_id": string,"sena_propuesta": number | null,"trabajo_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"estado"?: Database["public"]['Enums']["estado_postulacion"],"id"?: string,"mensaje": string,"precio_estimado"?: number | null,"profesional_id": string,"sena_propuesta"?: number | null,"trabajo_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"estado"?: Database["public"]['Enums']["estado_postulacion"],"id"?: string,"mensaje"?: string,"precio_estimado"?: number | null,"profesional_id"?: string,"sena_propuesta"?: number | null,"trabajo_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "postulaciones_profesional_id_fkey"
      columns: ["profesional_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "postulaciones_profesional_id_fkey"
      columns: ["profesional_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "postulaciones_trabajo_id_fkey"
      columns: ["trabajo_id"]
isOneToOne: false
      referencedRelation: "trabajos"
      referencedColumns: ["id"]
    }
                  ]
                },"preferencias_email": {
                  Row: {
                    "novedades": boolean,"trabajos_cerca": boolean,"updated_at": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "novedades"?: boolean,"trabajos_cerca"?: boolean,"updated_at"?: string,"usuario_id": string
                  }
                  Update: {
                    "novedades"?: boolean,"trabajos_cerca"?: boolean,"updated_at"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "preferencias_email_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: true
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "preferencias_email_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: true
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    }
                  ]
                },"reportes": {
                  Row: {
                    "autor_id": string | null,"created_at": string,"detalle": string | null,"estado": Database["public"]['Enums']["estado_reporte"],"id": string,"motivo": Database["public"]['Enums']["motivo_reporte"],"objetivo_id": string,"objetivo_tipo": string,"resuelto_por": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"created_at"?: string,"detalle"?: string | null,"estado"?: Database["public"]['Enums']["estado_reporte"],"id"?: string,"motivo": Database["public"]['Enums']["motivo_reporte"],"objetivo_id": string,"objetivo_tipo": string,"resuelto_por"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "autor_id"?: string | null,"created_at"?: string,"detalle"?: string | null,"estado"?: Database["public"]['Enums']["estado_reporte"],"id"?: string,"motivo"?: Database["public"]['Enums']["motivo_reporte"],"objetivo_id"?: string,"objetivo_tipo"?: string,"resuelto_por"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reportes_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reportes_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reportes_resuelto_por_fkey"
      columns: ["resuelto_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reportes_resuelto_por_fkey"
      columns: ["resuelto_por"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    }
                  ]
                },"resenas": {
                  Row: {
                    "autor_id": string,"created_at": string,"id": string,"profesional_id": string,"puntaje": number,"texto": string | null,"trabajo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id": string,"created_at"?: string,"id"?: string,"profesional_id": string,"puntaje": number,"texto"?: string | null,"trabajo_id"?: string | null
                  }
                  Update: {
                    "autor_id"?: string,"created_at"?: string,"id"?: string,"profesional_id"?: string,"puntaje"?: number,"texto"?: string | null,"trabajo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "resenas_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resenas_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resenas_profesional_id_fkey"
      columns: ["profesional_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resenas_profesional_id_fkey"
      columns: ["profesional_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resenas_trabajo_id_fkey"
      columns: ["trabajo_id"]
isOneToOne: false
      referencedRelation: "trabajos"
      referencedColumns: ["id"]
    }
                  ]
                },"trabajos": {
                  Row: {
                    "barrio_id": number,"cliente_id": string,"created_at": string,"descripcion": string,"estado": Database["public"]['Enums']["estado_trabajo"],"fotos": (string)[],"id": string,"oficio": Database["public"]['Enums']["oficio"],"presupuesto_estimado": number | null,"profesional_elegido_id": string | null,"titulo": string,"updated_at": string,"urgencia": Database["public"]['Enums']["urgencia"]
                  }
                  ComputedFields: never
                  Insert: {
                    "barrio_id": number,"cliente_id": string,"created_at"?: string,"descripcion": string,"estado"?: Database["public"]['Enums']["estado_trabajo"],"fotos"?: (string)[],"id"?: string,"oficio": Database["public"]['Enums']["oficio"],"presupuesto_estimado"?: number | null,"profesional_elegido_id"?: string | null,"titulo": string,"updated_at"?: string,"urgencia": Database["public"]['Enums']["urgencia"]
                  }
                  Update: {
                    "barrio_id"?: number,"cliente_id"?: string,"created_at"?: string,"descripcion"?: string,"estado"?: Database["public"]['Enums']["estado_trabajo"],"fotos"?: (string)[],"id"?: string,"oficio"?: Database["public"]['Enums']["oficio"],"presupuesto_estimado"?: number | null,"profesional_elegido_id"?: string | null,"titulo"?: string,"updated_at"?: string,"urgencia"?: Database["public"]['Enums']["urgencia"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "trabajos_barrio_id_fkey"
      columns: ["barrio_id"]
isOneToOne: false
      referencedRelation: "barrios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trabajos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trabajos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trabajos_profesional_elegido_id_fkey"
      columns: ["profesional_elegido_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trabajos_profesional_elegido_id_fkey"
      columns: ["profesional_elegido_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    }
                  ]
                },"usuarios": {
                  Row: {
                    "apellido": string | null,"barrio_id": number | null,"created_at": string,"estado": Database["public"]['Enums']["estado_cuenta"],"foto_path": string | null,"id": string,"nombre": string | null,"normas_aceptadas_at": string | null,"normas_version": string | null,"rol": Database["public"]['Enums']["rol"],"updated_at": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "apellido"?: string | null,"barrio_id"?: number | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_cuenta"],"foto_path"?: string | null,"id": string,"nombre"?: string | null,"normas_aceptadas_at"?: string | null,"normas_version"?: string | null,"rol"?: Database["public"]['Enums']["rol"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "apellido"?: string | null,"barrio_id"?: number | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_cuenta"],"foto_path"?: string | null,"id"?: string,"nombre"?: string | null,"normas_aceptadas_at"?: string | null,"normas_version"?: string | null,"rol"?: Database["public"]['Enums']["rol"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "usuarios_barrio_id_fkey"
      columns: ["barrio_id"]
isOneToOne: false
      referencedRelation: "barrios"
      referencedColumns: ["id"]
    }
                  ]
                },"verificaciones": {
                  Row: {
                    "created_at": string,"estado": Database["public"]['Enums']["estado_verificacion"],"id": string,"motivo_rechazo": string | null,"revisado_at": string | null,"revisado_por": string | null,"storage_path": string,"tipo": Database["public"]['Enums']["tipo_documento"],"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"estado"?: Database["public"]['Enums']["estado_verificacion"],"id"?: string,"motivo_rechazo"?: string | null,"revisado_at"?: string | null,"revisado_por"?: string | null,"storage_path": string,"tipo": Database["public"]['Enums']["tipo_documento"],"usuario_id": string
                  }
                  Update: {
                    "created_at"?: string,"estado"?: Database["public"]['Enums']["estado_verificacion"],"id"?: string,"motivo_rechazo"?: string | null,"revisado_at"?: string | null,"revisado_por"?: string | null,"storage_path"?: string,"tipo"?: Database["public"]['Enums']["tipo_documento"],"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verificaciones_revisado_por_fkey"
      columns: ["revisado_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verificaciones_revisado_por_fkey"
      columns: ["revisado_por"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verificaciones_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verificaciones_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "matricula_propia": {
                  Row: {
                    "matricula_numero": string | null,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "matricula_numero"?: string | null,"usuario_id"?: string | null
                         }
                        Update: {
                           "matricula_numero"?: string | null,"usuario_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "perfiles_profesionales_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: true
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "perfiles_profesionales_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: true
      referencedRelation: "usuarios_publicos"
      referencedColumns: ["id"]
    }
                  ]
                },"mis_verificaciones": {
                  Row: {
                    "created_at": string | null,"estado": Database["public"]['Enums']["estado_verificacion"] | null,"id": string | null,"motivo_rechazo": string | null,"tipo": Database["public"]['Enums']["tipo_documento"] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_verificacion"] | null,"id"?: string | null,"motivo_rechazo"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_documento"] | null
                         }
                        Update: {
                           "created_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_verificacion"] | null,"id"?: string | null,"motivo_rechazo"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_documento"] | null
                         }
                        Relationships: [
                    
                  ]
                },"usuarios_publicos": {
                  Row: {
                    "apellido_inicial": string | null,"barrio_id": number | null,"foto_path": string | null,"id": string | null,"nombre": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "aceptar_normas":
{ Args: { "p_version": string }; Returns: undefined
                           },
"actualizar_whatsapp":
{ Args: { "p_whatsapp": string }; Returns: undefined
                           },
"buscar_profesionales":
{ Args: { "p_barrio"?: number,"p_desde"?: number,"p_limite"?: number,"p_oficio"?: Database["public"]['Enums']["oficio"],"p_orden"?: string,"p_solo_matriculados"?: boolean,"p_toda_la_ciudad"?: boolean }; Returns: {
              "anios_experiencia": number,"antecedentes_ok": boolean,"apellido_inicial": string,"cantidad_resenas": number,"distancia_km": number,"foto_path": string,"identidad_verificada": boolean,"matriculado": boolean,"nombre": string,"oficios": (Database["public"]['Enums']["oficio"])[],"promedio": number,"total": number,"usuario_id": string,"zonas_texto": string
            }[]
                           },
"distancia_km":
{ Args: { "barrio_a": number,"barrio_b": number }; Returns: number
                           },
"registrar_documento":
{ Args: { "p_storage_path": string,"p_tipo": Database["public"]['Enums']["tipo_documento"] }; Returns: string
                           }
          }
          Enums: {
            "estado_cuenta": "activa"|"suspendida","estado_postulacion": "enviada"|"elegida"|"descartada"|"retirada","estado_reporte": "abierto"|"en_revision"|"resuelto","estado_trabajo": "abierto"|"asignado"|"cerrado"|"cancelado","estado_verificacion": "pendiente"|"aprobado"|"rechazado","motivo_reporte": "datos_falsos"|"comportamiento"|"estafa"|"contenido_inapropiado"|"otro","oficio": "carpinteria"|"plomeria"|"cerrajeria"|"gas"|"pintura"|"mecanica"|"electricidad","rol": "cliente"|"profesional"|"admin","tipo_documento": "dni_frente"|"dni_dorso"|"antecedentes"|"matricula","urgencia": "lo_antes_posible"|"esta_semana"|"sin_apuro"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "estado_cuenta": ["activa", "suspendida"],"estado_postulacion": ["enviada", "elegida", "descartada", "retirada"],"estado_reporte": ["abierto", "en_revision", "resuelto"],"estado_trabajo": ["abierto", "asignado", "cerrado", "cancelado"],"estado_verificacion": ["pendiente", "aprobado", "rechazado"],"motivo_reporte": ["datos_falsos", "comportamiento", "estafa", "contenido_inapropiado", "otro"],"oficio": ["carpinteria", "plomeria", "cerrajeria", "gas", "pintura", "mecanica", "electricidad"],"rol": ["cliente", "profesional", "admin"],"tipo_documento": ["dni_frente", "dni_dorso", "antecedentes", "matricula"],"urgencia": ["lo_antes_posible", "esta_semana", "sin_apuro"]
          }
        }
} as const
