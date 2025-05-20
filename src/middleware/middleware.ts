import { PrismaClient } from "../../generated/prisma";
import { encrypt, decrypt } from '../utils/crypto';

const prisma = new PrismaClient();

const FIELDS_TO_ENCRYPT = ['name', 'cookingTime', 'calories', 'image', 'ingredients', 'steps'];

prisma.$use(async (params, next) => {
    const isRecipeModel = params.model === 'Recipe' || params.model === 'FavoriteRecipe';

    if (isRecipeModel && (params.action === 'create' || params.action === 'update')) {
        for (const field of FIELDS_TO_ENCRYPT) {
            if (field in params.args.data) {
                const raw = params.args.data[field];

                const valueToEncrypt = typeof raw === 'object'
                    ? JSON.stringify(raw)
                    : String(raw);

                if (params.args.data[field]) {
                    console.log(`Шифрую ${field}:`, params.args.data[field]);
                }

                params.args.data[field] = encrypt(valueToEncrypt);
            }
        }
    }

    const result = await next(params);

    if (
        isRecipeModel &&
        ['findUnique', 'findMany', 'findFirst'].includes(params.action)
    ) {
        const decryptField = (field: any) => {
            if (!field || typeof field !== 'string') return field;
            if (!field.includes(":")) return field;
            try {
                const decrypted = decrypt(field);
                try {
                    return JSON.parse(decrypted);
                } catch {
                    return decrypted;
                }
            } catch (err) {
                console.warn("Ошибка дешифровки поля:", field);
                return null;
            }
        };

        const decryptRecipe = (record: any) => {
            const decryptedRecord = { ...record };
            for (const field of FIELDS_TO_ENCRYPT) {
                decryptedRecord[field] = decryptField(record[field]);
            }
            console.log(`Расшифровка рецепта:`, decryptedRecord);
            return decryptedRecord;
        };

        if (Array.isArray(result)) {
            return result.map(decryptRecipe);
        } else if (result) {
            return decryptRecipe(result);
        }
    }

    return result;
});

export default prisma;
