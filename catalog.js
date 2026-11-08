/* Starter catalog for a new list. Aisles are in a typical store-walk order, so the shopping
   list reads top to bottom as you go round. Everything is editable in the app, and anything
   you type that isn't here is added to the catalog for next time. */
export const AISLES = [
  ['produce', 'Produce', '🥕'],
  ['bakery', 'Bakery', '🍞'],
  ['deli', 'Deli', '🧀'],
  ['meat', 'Meat & seafood', '🍗'],
  ['dairy', 'Dairy & eggs', '🥛'],
  ['pantry', 'Pantry', '🥫'],
  ['breakfast', 'Breakfast', '🥣'],
  ['snacks', 'Snacks', '🍿'],
  ['frozen', 'Frozen', '🧊'],
  ['drinks', 'Drinks', '🧃'],
  ['household', 'Household', '🧻'],
  ['personal', 'Personal care', '🧴'],
  ['kids', 'Kids', '🧸'],
  ['pet', 'Pet', '🐾'],
  ['other', 'Other', '🛒'],
];

export const STARTER = {
  produce: ['Bananas', 'Apples', 'Strawberries', 'Grapes', 'Lemons', 'Avocados', 'Tomatoes', 'Onions', 'Garlic', 'Potatoes', 'Carrots', 'Broccoli', 'Lettuce', 'Spinach', 'Cucumber', 'Bell peppers'],
  bakery: ['Bread', 'Bagels', 'Tortillas', 'Hamburger buns'],
  deli: ['Sliced turkey', 'Sliced cheese', 'Hummus'],
  meat: ['Chicken breasts', 'Ground beef', 'Bacon', 'Salmon', 'Sausage'],
  dairy: ['Milk', 'Eggs', 'Butter', 'Shredded cheese', 'Yogurt', 'Cream cheese', 'Sour cream'],
  pantry: ['Pasta', 'Pasta sauce', 'Rice', 'Canned beans', 'Chicken broth', 'Peanut butter', 'Jelly', 'Olive oil', 'Flour', 'Sugar', 'Salt'],
  breakfast: ['Cereal', 'Oatmeal', 'Coffee', 'Pancake mix', 'Syrup'],
  snacks: ['Crackers', 'Chips', 'Granola bars', 'Goldfish', 'Popcorn'],
  frozen: ['Frozen veggies', 'Frozen pizza', 'Ice cream', 'Chicken nuggets'],
  drinks: ['Juice', 'Sparkling water', 'Coffee creamer'],
  household: ['Paper towels', 'Toilet paper', 'Dish soap', 'Dishwasher pods', 'Laundry detergent', 'Trash bags', 'Zip bags', 'Aluminum foil'],
  personal: ['Toothpaste', 'Shampoo', 'Body wash', 'Deodorant'],
  kids: ['Juice boxes', 'Fruit snacks'],
  pet: [],
  other: [],
};

/* A guess at the aisle for something typed in, so new items land somewhere sensible. */
const HINTS = [
  ['produce', /apple|banana|berr|grape|lemon|lime|orange|avocado|tomato|onion|garlic|potato|carrot|broccoli|lettuce|spinach|kale|cucumber|pepper|celery|mushroom|zucchini|squash|corn|herb|cilantro|basil|parsley|fruit|melon|peach|pear|plum|cherr|mango|pineapple|salad|veggie|vegetable/i],
  ['bakery', /bread|bagel|bun|roll|tortilla|muffin|croissant|cake|pita|naan|loaf/i],
  ['deli', /deli|sliced|salami|ham\b|prosciutto|hummus|olive/i],
  ['meat', /chicken|beef|pork|steak|bacon|sausage|turkey|salmon|fish|shrimp|tuna steak|lamb|ground|ribs|meat/i],
  ['dairy', /milk|egg|butter|cheese|yogurt|yoghurt|cream|kefir/i],
  ['frozen', /frozen|ice cream|popsicle|nugget/i],
  ['breakfast', /cereal|oat|coffee|tea\b|pancake|waffle|syrup|granola\b/i],
  ['snacks', /chip|cracker|cookie|pretzel|popcorn|candy|chocolate|snack|nuts?\b/i],
  ['drinks', /juice|soda|water|beer|wine|seltzer|drink|lemonade|kombucha/i],
  ['pantry', /pasta|noodle|rice|bean|sauce|broth|soup|flour|sugar|salt|spice|oil|vinegar|ketchup|mustard|mayo|honey|jam|jelly|peanut|can(ned)?\b|tuna|baking/i],
  ['household', /paper|towel|toilet|soap|detergent|bag|foil|wrap|sponge|cleaner|bleach|battery|batteries|light ?bulb|napkin|plate|cup/i],
  ['personal', /tooth|shampoo|conditioner|deodorant|lotion|razor|floss|vitamin|medicine|tylenol|advil|bandage|sunscreen|tissue/i],
  ['kids', /diaper|wipes|kid|baby|formula/i],
  ['pet', /dog|cat|pet|litter|kibble/i],
];
export function guessAisle(name) {
  const hit = HINTS.find(([, re]) => re.test(name));
  return hit ? hit[0] : 'other';
}
