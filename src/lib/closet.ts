export interface ClosetItem {
  tops: string[];
  bottoms: string[];
  shoes: string[];
  outerwear: string[];
  accessories: string[];
}

export const getClosetItems = (): ClosetItem => {
  return {
    tops: [
      "white t-shirt",
      "blue button-down",
      "gray sweater",
      "black hoodie",
      "striped polo",
    ],
    bottoms: ["jeans", "khakis", "black dress pants", "shorts", "leggings"],
    shoes: ["sneakers", "dress shoes", "boots", "sandals"],
    outerwear: ["light jacket", "winter coat", "rain jacket", "blazer"],
    accessories: ["watch", "sunglasses", "scarf", "baseball cap"],
  };
};

export const formatClosetDisplay = (closet: ClosetItem): string => {
  return `Available clothing:
Tops: ${closet.tops.join(", ")}
Bottoms: ${closet.bottoms.join(", ")}
Shoes: ${closet.shoes.join(", ")}
Outerwear: ${closet.outerwear.join(", ")}
Accessories: ${closet.accessories.join(", ")}`;
};
