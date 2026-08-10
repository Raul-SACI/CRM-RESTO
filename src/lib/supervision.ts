// Configuración editable del formulario de supervisión (clientes ocultos).
// Los textos y las opciones se guardan dentro de designConfig.supervision y
// se pueden editar desde ADMIN → Supervisiones. La estructura del formulario
// (qué campos hay y la lógica condicional bebida/comida) vive en el código.

export interface SupervisionField {
  label: string;
  hint?: string;
}

// Pregunta agregada por el admin (además de las fijas del formulario).
export type CustomQuestionType = 'stars' | 'options' | 'text';
export interface CustomQuestion {
  id: string;
  type: CustomQuestionType;
  label: string;
  hint?: string;
  options?: string[]; // solo para type 'options'
}

export function makeCustomQuestion(): CustomQuestion {
  const id =
    (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `q_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  return { id, type: 'stars', label: '', hint: '', options: [] };
}

export interface SupervisionConfig {
  fields: {
    cleanlinessVenue: SupervisionField;
    cleanlinessBathroom: SupervisionField;
    disposition: SupervisionField;
    waiterName: SupervisionField;
    waitGreeting: SupervisionField;
    waitOrderTaken: SupervisionField;
    orderType: SupervisionField;
    waitOrderDelivered: SupervisionField;
    photo: SupervisionField;
    aestheticsFood: SupervisionField;
    qualityFood: SupervisionField;
    aestheticsDrink: SupervisionField;
    qualityDrink: SupervisionField;
    waitBill: SupervisionField;
    overall: SupervisionField;
    comment: SupervisionField;
  };
  orderTypeDrinkLabel: string;
  orderTypeFoodLabel: string;
  waitGreetingOptions: string[];
  waitOrderTakenOptions: string[];
  waitBillOptions: string[];
  deliverDrinkOptions: string[];
  deliverFoodOptions: string[];
  // Claves de campos fijos que el admin decidió ocultar del formulario.
  disabledFields: string[];
  // Preguntas extra agregadas por el admin.
  customQuestions: CustomQuestion[];
}

// Campos fijos que NO se pueden ocultar (anclas del formulario).
export const SUP_REQUIRED_FIELDS: string[] = ['overall'];

export type SupervisionFieldKey = keyof SupervisionConfig['fields'];
export type SupervisionOptionKey =
  | 'waitGreetingOptions'
  | 'waitOrderTakenOptions'
  | 'waitBillOptions'
  | 'deliverDrinkOptions'
  | 'deliverFoodOptions';

export const DEFAULT_SUPERVISION: SupervisionConfig = {
  fields: {
    cleanlinessVenue: { label: 'Limpieza e higiene del local', hint: 'Pisos, vidrios, mesas' },
    cleanlinessBathroom: { label: 'Limpieza e higiene del baño', hint: '' },
    disposition: { label: 'Predisposición del mozo/a para atenderte', hint: '' },
    waiterName: { label: 'Nombre de quién te atendió', hint: '' },
    waitGreeting: { label: 'Tiempo de espera hasta que te atendieron', hint: '' },
    waitOrderTaken: { label: 'Tiempo de espera hasta que te tomaron el pedido', hint: 'Cuando ya habías dejado la carta a un lado' },
    orderType: { label: '¿Qué pediste?', hint: '' },
    waitOrderDelivered: { label: 'Tiempo de espera hasta que te trajeron el pedido', hint: 'Desde que se lo indicaste al mozo/a' },
    photo: { label: 'Sacá una foto a tu plato / bebida', hint: '' },
    aestheticsFood: { label: 'Estética de la comida', hint: '' },
    qualityFood: { label: 'Calidad de la comida', hint: '' },
    aestheticsDrink: { label: 'Estética de la bebida', hint: '' },
    qualityDrink: { label: 'Calidad de la bebida', hint: '' },
    waitBill: { label: 'Tiempo de espera hasta que te trajeron la cuenta', hint: 'Desde que se la pediste al mozo/a' },
    overall: { label: 'Calificación general de la experiencia', hint: 'Tu valoración global de la visita' },
    comment: { label: 'Observaciones', hint: '' },
  },
  orderTypeDrinkLabel: 'Solo bebida',
  orderTypeFoodLabel: 'Bebida y comida',
  waitGreetingOptions: ['0-3 minutos', '4-6 minutos', 'Más de 6 minutos'],
  waitOrderTakenOptions: ['0-3 minutos', '4-6 minutos', 'Más de 6 minutos'],
  waitBillOptions: ['0-3 minutos', '4-6 minutos', 'Más de 6 minutos'],
  deliverDrinkOptions: ['0-6 minutos', 'Más de 6 minutos'],
  deliverFoodOptions: ['7-12 minutos', '12-15 minutos', 'Más de 15 minutos'],
  disabledFields: [],
  customQuestions: [],
};

// Sanitiza la lista de preguntas personalizadas guardada.
function sanitizeCustomQuestions(list: any): CustomQuestion[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((q) => q && typeof q.id === 'string')
    .map((q) => {
      const type: CustomQuestionType = q.type === 'options' || q.type === 'text' ? q.type : 'stars';
      return {
        id: q.id,
        type,
        label: String(q.label || '').trim(),
        hint: q.hint ? String(q.hint) : '',
        options: type === 'options'
          ? (Array.isArray(q.options) ? q.options.map((o: any) => String(o)).filter((o: string) => o.trim()) : [])
          : [],
      };
    })
    .filter((q) => q.label); // descartamos las preguntas sin texto
}

const arr = (a: any, fallback: string[]): string[] =>
  Array.isArray(a) && a.filter((x) => String(x || '').trim()).length > 0
    ? a.map((x: any) => String(x)).filter((x: string) => x.trim())
    : fallback;

// Combina la config guardada (parcial) con los valores por defecto, para que
// nunca falte un texto aunque la config guardada sea de una versión anterior.
export function resolveSupervisionConfig(sc?: Partial<SupervisionConfig> | null): SupervisionConfig {
  const d = DEFAULT_SUPERVISION;
  if (!sc) return d;
  const fields = {} as SupervisionConfig['fields'];
  (Object.keys(d.fields) as SupervisionFieldKey[]).forEach((k) => {
    const dv = d.fields[k];
    const sv = (sc.fields as any)?.[k] || {};
    (fields as any)[k] = {
      label: (sv.label ?? '').trim() || dv.label,
      hint: sv.hint !== undefined ? sv.hint : dv.hint,
    };
  });
  return {
    fields,
    orderTypeDrinkLabel: (sc.orderTypeDrinkLabel || '').trim() || d.orderTypeDrinkLabel,
    orderTypeFoodLabel: (sc.orderTypeFoodLabel || '').trim() || d.orderTypeFoodLabel,
    waitGreetingOptions: arr(sc.waitGreetingOptions, d.waitGreetingOptions),
    waitOrderTakenOptions: arr(sc.waitOrderTakenOptions, d.waitOrderTakenOptions),
    waitBillOptions: arr(sc.waitBillOptions, d.waitBillOptions),
    deliverDrinkOptions: arr(sc.deliverDrinkOptions, d.deliverDrinkOptions),
    deliverFoodOptions: arr(sc.deliverFoodOptions, d.deliverFoodOptions),
    disabledFields: Array.isArray(sc.disabledFields)
      ? sc.disabledFields.filter((k) => typeof k === 'string' && !SUP_REQUIRED_FIELDS.includes(k))
      : [],
    customQuestions: sanitizeCustomQuestions(sc.customQuestions),
  };
}

// Orden y agrupación de los campos de texto para el editor del admin.
export const SUP_TEXT_FIELDS: { key: SupervisionFieldKey; section: string; hasHint: boolean }[] = [
  { key: 'cleanlinessVenue', section: 'Limpieza', hasHint: true },
  { key: 'cleanlinessBathroom', section: 'Limpieza', hasHint: true },
  { key: 'disposition', section: 'Atención', hasHint: true },
  { key: 'waiterName', section: 'Atención', hasHint: true },
  { key: 'waitGreeting', section: 'Atención', hasHint: true },
  { key: 'waitOrderTaken', section: 'Atención', hasHint: true },
  { key: 'orderType', section: 'El pedido', hasHint: true },
  { key: 'waitOrderDelivered', section: 'El pedido', hasHint: true },
  { key: 'photo', section: 'El plato', hasHint: true },
  { key: 'aestheticsFood', section: 'El plato', hasHint: true },
  { key: 'qualityFood', section: 'El plato', hasHint: true },
  { key: 'aestheticsDrink', section: 'El plato', hasHint: true },
  { key: 'qualityDrink', section: 'El plato', hasHint: true },
  { key: 'waitBill', section: 'Cierre', hasHint: true },
  { key: 'overall', section: 'Cierre', hasHint: true },
  { key: 'comment', section: 'Cierre', hasHint: false },
];

// Listas de opciones editables (una opción por línea en el editor).
export const SUP_OPTION_LISTS: { key: SupervisionOptionKey; label: string }[] = [
  { key: 'waitGreetingOptions', label: 'Opciones — tiempo hasta que te atendieron' },
  { key: 'waitOrderTakenOptions', label: 'Opciones — tiempo hasta que tomaron el pedido' },
  { key: 'deliverDrinkOptions', label: 'Opciones — entrega (solo bebida)' },
  { key: 'deliverFoodOptions', label: 'Opciones — entrega (bebida y comida)' },
  { key: 'waitBillOptions', label: 'Opciones — tiempo hasta la cuenta' },
];
