
/**
 * Converts a number to its word representation in Spanish.
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'cero';
  if (num === 1) return 'un peso';
  if (num > 999999999) return num.toLocaleString(); // Limit for simplicity

  const originalNum = num;

  const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const convertGroup = (n: number): string => {
    let output = '';

    if (n >= 100) {
      if (n === 100) output += 'cien ';
      else {
        output += hundreds[Math.floor(n / 100)] + ' ';
      }
      n %= 100;
    }

    if (n >= 20) {
      if (n === 20) output += 'veinte';
      else if (n < 30) {
        output += 'veinti' + units[n % 10];
      } else {
        output += tens[Math.floor(n / 10)];
        if (n % 10 !== 0) output += ' y ' + units[n % 10];
      }
    } else if (n >= 10) {
      output += teens[n - 10];
    } else if (n > 0) {
      output += units[n];
    }

    return output.trim();
  };

  let result = '';
  
  // Millions
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    if (millions === 1) result += 'un millón ';
    else result += convertGroup(millions) + ' millones ';
    num %= 1000000;
  }

  // Thousands
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) result += 'mil ';
    else result += convertGroup(thousands) + ' mil ';
    num %= 1000;
  }

  // Units
  if (num > 0) {
    result += convertGroup(num);
  }

  const resultStr = result.trim().toLowerCase();
  return resultStr + ' pesos';
}
