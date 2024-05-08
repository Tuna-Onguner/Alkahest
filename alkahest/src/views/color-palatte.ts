export class ColorPalatte {
  private static readonly _palatte = {
    "Seashell": "#F9F6EE",
    "Illuminating Emerald": "#339966",
    "Avocado": "#669900",
    "Sizzling Sunrise": "#FDDA0D",
    "Deep Carrot Orange": "#E5682D",
    "Persian Red": "#CC3333",
  };
  
  public static white(): string {
    return ColorPalatte._palatte["Seashell"];
  }

  public static green(): string {
    return ColorPalatte._palatte["Illuminating Emerald"];
  }

  public static light_green(): string {
    return ColorPalatte._palatte["Avocado"];
  }

  public static yellow(): string {
    return ColorPalatte._palatte["Sizzling Sunrise"];
  }

  public static orange(): string {
    return ColorPalatte._palatte["Deep Carrot Orange"];
  }

  public static red(): string {
    return ColorPalatte._palatte["Persian Red"];
  }
}
