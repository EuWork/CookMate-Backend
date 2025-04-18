import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma";
import cors from "cors";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.post("/recipes", async (req: Request, res: Response) => {
  try {
    const { name, cookingTime, calories, image, ingredients, steps } = req.body;

    const newRecipe = await prisma.recipe.create({
      data: {
        name,
        cookingTime,
        calories,
        image: image || null,
        ingredients: JSON.stringify(ingredients),
        steps: JSON.stringify(steps),
      }
    });

    return res.status(201).json({
      ...newRecipe,
      ingredients: (newRecipe.ingredients),
      steps: (newRecipe.steps),
    });

  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/recipes", async (_: Request, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany();

    const formattedRecipes = recipes.map(recipe => {
      let ingredientsParsed: Array<{name: string, amount: string}> = [];
      if (recipe.ingredients && typeof recipe.ingredients === 'string') {
        try {
          ingredientsParsed = JSON.parse(recipe.ingredients);
        } catch (e) {
        }
      }

      let stepsParsed: string[] = [];
      if (recipe.steps && typeof recipe.steps === 'string') {
        try {
          stepsParsed = JSON.parse(recipe.steps);
        } catch (e) {
        }
      }

      return {
        ...recipe,
        ingredients: ingredientsParsed,
        steps: stepsParsed
      };
    });

    return res.status(200).json(formattedRecipes);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

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
        ingredients: JSON.stringify(ingredients),
        steps: JSON.stringify(steps),
      }
    });

    return res.status(200).json({
      ...updatedRecipe,
      ingredients: JSON.parse(updatedRecipe.ingredients as string),
      steps: JSON.parse(updatedRecipe.steps as string),
    });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

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

    const recipeExists = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipeExists) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const existingFavorite = await prisma.favoriteRecipe.findUnique({
      where: { recipeId }
    });

    if (existingFavorite) {
      return res.status(400).json({ error: "Recipe already in favorites" });
    }

    await prisma.favoriteRecipe.create({
      data: { recipeId }
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/favorites", async (_: Request, res: Response) => {
  try {
    const favorites = await prisma.favoriteRecipe.findMany({
      include: {
        recipe: true
      }
    });
    return res.status(200).json(favorites.map(fav => fav.recipe));
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

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

app.delete("/favorites/:recipeId", async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;

    await prisma.favoriteRecipe.delete({
      where: { recipeId: parseInt(recipeId) }
    });

    return res.status(200).send();
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});