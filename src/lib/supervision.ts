// Configuración editable del formulario de supervisión (clientes ocultos).
// Los textos y las opciones se guardan dentro de designConfig.supervision y
// se pueden editar desde ADMIN → Supervisiones. La estructura del formulario
// (qué campos hay y la lógica condicional bebida/comida) vive en el código.

export interface SupervisionField {
  label: string;
  hint?: string;
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
    aesthetics: SupervisionField;
    foodQuality: SupervisionField;
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
}

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
    aesthetics: { label: 'Estética del plato / bebida', hint: '' },
    foodQuality: { label: 'Calidad del plato / bebida', hint: '' },
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
};

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
  { key: 'aesthetics', section: 'El plato', hasHint: true },
  { key: 'foodQuality', section: 'El plato', hasHint: true },
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
