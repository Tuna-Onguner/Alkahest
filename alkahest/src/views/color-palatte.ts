export class ColorPalatte {
  public static white(): string {
    return "#F9F6EE";
  }

  public static green(): string {
    return "#339966";
  }

  public static light_green(): string {
    return "#669900";
  }

  public static yellow(): string {
    return "#FDDA0D";
  }

  public static orange(): string {
    return "#E5682D";
  }

  public static red(): string {
    return "#CC3333";
  }

  public static colorDeciderByPercentage(percentage: number): string {
    if (percentage === 0) {
      return ColorPalatte.white();
    } else if (percentage <= 5) {
      return ColorPalatte.green();
    } else if (percentage <= 10) {
      return ColorPalatte.light_green();
    } else if (percentage <= 15) {
      return ColorPalatte.yellow();
    } else if (percentage <= 20) {
      return ColorPalatte.orange();
    } else {
      return ColorPalatte.red();
    }
  }
}
