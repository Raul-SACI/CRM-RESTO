// Configuración editable del formulario de supervisión (clientes ocultos).
// Los textos y las opciones se guardan dentro de designConfig.supervision y
// se pueden editar desde ADMIN → Supervisiones. La estructura del formulario
// (qué campos hay y la lógica condicional bebida/comida) vive en el código.

export interface SupervisionField {
  label: string;
  hint?: string;
}

// Secciones del formulario donde puede ubicarse una pregunta adicional.
export type SupervisionSectionKey =
  | 'limpieza'
  | 'atencion'
  | 'pedido'
  | 'plato'
  | 'cierre'
  | 'adicionales';

export const SUP_SECTIONS: { key: SupervisionSectionKey; label: string }[] = [
  { key: 'limpieza', label: 'Limpieza e higiene' },
  { key: 'atencion', label: 'Atención' },
  { key: 'pedido', label: 'El pedido' },
  { key: 'plato', label: 'El plato / bebida' },
  { key: 'cierre', label: 'Cierre' },
  { key: 'adicionales', label: 'Preguntas adicionales' },
];

const SUP_SECTION_KEYS: SupervisionSectionKey[] = SUP_SECTIONS.map((s) => s.key);

// Sección creada por el admin (se agrega al final, después de las fijas).
export interface CustomSection {
  id: string;
  label: string;
}

function makeId(prefix: string): string {
  return (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
    ? (crypto as any).randomUUID()
    : `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export function makeCustomSection(): CustomSection {
  return { id: makeId('sec'), label: '' };
}

// Pregunta agregada por el admin (además de las fijas del formulario).
export type CustomQuestionType = 'stars' | 'options' | 'text';
export interface CustomQuestion {
  id: string;
  type: CustomQuestionType;
  label: string;
  hint?: string;
  options?: string[]; // solo para type 'options'
  // Sección donde aparece: una clave fija (SupervisionSectionKey) o el id de
  // una sección creada por el admin (CustomSection.id).
  section?: string;
}

export function makeCustomQuestion(): CustomQuestion {
  return { id: makeId('q'), type: 'stars', label: '', hint: '', options: [], section: 'adicionales' };
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
  // Secciones nuevas creadas por el admin (se muestran después de las fijas).
  customSections: CustomSection[];
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
  customSections: [],
};

// Sanitiza las secciones creadas por el admin (con id y texto no vacío).
function sanitizeCustomSections(list: any): CustomSection[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s && typeof s.id === 'string')
    .map((s) => ({ id: s.id, label: String(s.label || '').trim() }))
    .filter((s) => s.label);
}

// Sanitiza la lista de preguntas personalizadas guardada.
// validSections: claves fijas + ids de secciones creadas por el admin.
function sanitizeCustomQuestions(list: any, validSections: Set<string>): CustomQuestion[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((q) => q && typeof q.id === 'string')
    .map((q) => {
      const type: CustomQuestionType = q.type === 'options' || q.type === 'text' ? q.type : 'stars';
      const section: string = typeof q.section === 'string' && validSections.has(q.section) ? q.section : 'adicionales';
      return {
        id: q.id,
        type,
        label: String(q.label || '').trim(),
        hint: q.hint ? String(q.hint) : '',
        options: type === 'options'
          ? (Array.isArray(q.options) ? q.options.map((o: any) => String(o)).filter((o: string) => o.trim()) : [])
          : [],
        section,
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
  const customSections = sanitizeCustomSections(sc.customSections);
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
    customSections,
    customQuestions: sanitizeCustomQuestions(
      sc.customQuestions,
      new Set<string>([...SUP_SECTION_KEYS, ...customSections.map((s) => s.id)]),
    ),
  };
}

// Orden y agrupación de los campos de texto para el editor del admin.
// sectionKey enlaza cada campo fijo con la sección (misma clave que usan las
// preguntas personalizadas), para poder mostrarlas juntas en el editor.
export const SUP_TEXT_FIELDS: { key: SupervisionFieldKey; section: string; sectionKey: SupervisionSectionKey; hasHint: boolean }[] = [
  { key: 'cleanlinessVenue', section: 'Limpieza', sectionKey: 'limpieza', hasHint: true },
  { key: 'cleanlinessBathroom', section: 'Limpieza', sectionKey: 'limpieza', hasHint: true },
  { key: 'disposition', section: 'Atención', sectionKey: 'atencion', hasHint: true },
  { key: 'waiterName', section: 'Atención', sectionKey: 'atencion', hasHint: true },
  { key: 'waitGreeting', section: 'Atención', sectionKey: 'atencion', hasHint: true },
  { key: 'waitOrderTaken', section: 'Atención', sectionKey: 'atencion', hasHint: true },
  { key: 'orderType', section: 'El pedido', sectionKey: 'pedido', hasHint: true },
  { key: 'waitOrderDelivered', section: 'El pedido', sectionKey: 'pedido', hasHint: true },
  { key: 'photo', section: 'El plato', sectionKey: 'plato', hasHint: true },
  { key: 'aestheticsFood', section: 'El plato', sectionKey: 'plato', hasHint: true },
  { key: 'qualityFood', section: 'El plato', sectionKey: 'plato', hasHint: true },
  { key: 'aestheticsDrink', section: 'El plato', sectionKey: 'plato', hasHint: true },
  { key: 'qualityDrink', section: 'El plato', sectionKey: 'plato', hasHint: true },
  { key: 'waitBill', section: 'Cierre', sectionKey: 'cierre', hasHint: true },
  { key: 'overall', section: 'Cierre', sectionKey: 'cierre', hasHint: true },
  { key: 'comment', section: 'Cierre', sectionKey: 'cierre', hasHint: false },
];

// Claves de las secciones fijas (las que tienen campos fijos en el editor).
export const SUP_FIXED_SECTION_KEYS: SupervisionSectionKey[] = ['limpieza', 'atencion', 'pedido', 'plato', 'cierre'];

// Listas de opciones editables (una opción por línea en el editor).
export const SUP_OPTION_LISTS: { key: SupervisionOptionKey; label: string }[] = [
  { key: 'waitGreetingOptions', label: 'Opciones — tiempo hasta que te atendieron' },
  { key: 'waitOrderTakenOptions', label: 'Opciones — tiempo hasta que tomaron el pedido' },
  { key: 'deliverDrinkOptions', label: 'Opciones — entrega (solo bebida)' },
  { key: 'deliverFoodOptions', label: 'Opciones — entrega (bebida y comida)' },
  { key: 'waitBillOptions', label: 'Opciones — tiempo hasta la cuenta' },
];
