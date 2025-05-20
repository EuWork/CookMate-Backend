import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import prisma from "./middleware/middleware";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Слишком много запросов, попробуйте позже.'
});

app.use(cors());
app.use(express.json());
app.use(apiLimiter);

// Create recipe
app.post("/recipes", async (req: Request, res: Response) => {
  try {
    const { name, cookingTime, calories, image, ingredients, steps } = req.body;

    const newRecipe = await prisma.recipe.create({
      data: {
        name,
        cookingTime,
        calories,
        image: image || null,
        ingredients,
        steps,
      }
    });

    return res.status(201).json(newRecipe);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all recipes
app.get("/recipes", async (_: Request, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany();
    return res.status(200).json(recipes);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update recipe
app.put("/recipes/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cookingTime, calories, image, ingredients, steps } = req.body;

    const updatedRecipe = await prisma.recipe.update({
      where: { id: parseInt(id) },
      data: {
        name,
        cookingTime,
        calories,
        image: image || null,
        ingredients,
        steps,
      }
    });

    return res.status(200).json(updatedRecipe);
  } catch (error) {
    console.error("Error updating recipe:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete recipe
app.delete("/recipes/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.recipe.delete({
      where: { id: parseInt(id) }
    });

    return res.status(200).send();
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/favorites", async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.body;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const existingFavorite = await prisma.favoriteRecipe.findUnique({
      where: { recipeId }
    });

    if (existingFavorite) {
      return res.status(400).json({ error: "Recipe already in favorites" });
    }

    const newFavorite = await prisma.favoriteRecipe.create({
      data: {
        recipeId,
        name: recipe.name,
        cookingTime: recipe.cookingTime,
        calories: recipe.calories,
        image: recipe.image,
        ingredients: recipe.ingredients ?? [],
        steps: recipe.steps ?? []
      }
    });

    return res.status(201).json(newFavorite);
  } catch (error) {
    console.error("Error adding favorite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all favorites
app.get("/favorites", async (_: Request, res: Response) => {
  try {
    const favorites = await prisma.favoriteRecipe.findMany({
      include: {
        recipe: true
      }
    });

    const formattedFavorites = favorites.map(fav => ({
      id: fav.externalId || fav.recipe?.id.toString(),
      name: fav.name,
      cookingTime: fav.cookingTime,
      calories: fav.calories,
      image: fav.image,
      ingredients: fav.ingredients,
      steps: fav.steps,
      isExternal: !!fav.externalId
    }));

    return res.status(200).json(formattedFavorites);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Check if recipe is favorite
app.get("/favorites/:recipeId", async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;

    const favorite = await prisma.favoriteRecipe.findUnique({
      where: { recipeId: parseInt(recipeId) }
    });

    return res.status(200).json({ isFavorite: !!favorite });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete favorite
app.delete("/favorites/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedByRecipeId = await prisma.favoriteRecipe.deleteMany({
      where: {
        OR: [
          { recipeId: parseInt(id) },
          { externalId: id }
        ]
      }
    });

    if (deletedByRecipeId.count === 0) {
      return res.status(404).json({ error: "Favorite recipe not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Add external recipe to favorites
app.post("/favorites/external", async (req: Request, res: Response) => {
  try {
    const {
      externalId,
      name,
      cookingTime,
      calories,
      image,
      ingredients,
      steps
    } = req.body;

    const existingFavorite = await prisma.favoriteRecipe.findUnique({
      where: { externalId }
    });

    if (existingFavorite) {
      return res.status(400).json({ error: "Recipe already in favorites" });
    }

    const newFavorite = await prisma.favoriteRecipe.create({
      data: {
        externalId,
        name,
        cookingTime,
        calories,
        image: image || null,
        ingredients,
        steps
      }
    });

    return res.status(201).json(newFavorite);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
