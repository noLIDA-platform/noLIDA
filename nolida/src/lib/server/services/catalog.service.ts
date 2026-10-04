import { ServiceError } from "@/lib/server/services/service-error";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import * as categoriesRepo from "@/lib/server/repositories/categories.repo";
import * as servicesRepo from "@/lib/server/repositories/services.repo";
import * as productsRepo from "@/lib/server/repositories/products.repo";
import type {
  ProductCreateInput,
  ProductUpdateFields,
} from "@/lib/server/repositories/products.repo";
import type {
  ServiceCreateInput,
  ServiceUpdateFields,
} from "@/lib/server/repositories/services.repo";

type ServiceData = Omit<ServiceCreateInput, "businessId">;
type ProductData = Omit<ProductCreateInput, "businessId">;

async function requireOwnedBusiness(
  userId: string,
  businessId: string,
): Promise<void> {
  const business = await businessesRepo.findById(businessId);
  if (!business) {
    throw new ServiceError("NOT_FOUND", "That business was not found.");
  }
  if (business.owner_user_id !== userId) {
    throw new ServiceError("FORBIDDEN", "You do not own this business.");
  }
}

async function requireCategory(categoryId: string | null | undefined): Promise<void> {
  if (categoryId == null) return;
  const category = await categoriesRepo.findById(categoryId);
  if (!category) {
    throw new ServiceError("INVALID", "Choose a valid category.");
  }
}

function validateNameAndDescription(input: {
  name?: string;
  description?: string | null;
}): void {
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 120) {
      throw new ServiceError("INVALID", "Names must be between 2 and 120 characters.");
    }
  }
  if (input.description != null && input.description.length > 1000) {
    throw new ServiceError("INVALID", "Descriptions cannot exceed 1000 characters.");
  }
}

function validateServicePrices(input: {
  priceMin?: number | null;
  priceMax?: number | null;
}): void {
  for (const value of [input.priceMin, input.priceMax]) {
    if (value != null && (!Number.isSafeInteger(value) || value < 0)) {
      throw new ServiceError("INVALID", "Prices must be non-negative integer minor units.");
    }
  }
  if (
    input.priceMin != null &&
    input.priceMax != null &&
    input.priceMax < input.priceMin
  ) {
    throw new ServiceError("INVALID", "The maximum price must be at least the minimum price.");
  }
}

/** How many images one product may carry. Enforced here and in the zod schema. */
export const PRODUCT_IMAGES_MAX = 5;

function validateProduct(input: {
  price?: number;
  stock?: number | null;
  images?: string[];
}): void {
  if (input.price !== undefined && (!Number.isSafeInteger(input.price) || input.price < 0)) {
    throw new ServiceError("INVALID", "Price must be a non-negative integer in minor units.");
  }
  if (input.stock != null && (!Number.isSafeInteger(input.stock) || input.stock < 0)) {
    throw new ServiceError("INVALID", "Stock must be a non-negative integer.");
  }
  if (input.images && input.images.length > PRODUCT_IMAGES_MAX) {
    throw new ServiceError(
      "INVALID",
      `A product can have at most ${PRODUCT_IMAGES_MAX} images.`,
    );
  }
  if (
    input.images?.some((image) => {
      // https-only, same rule as post media: these URLs land in an `<img src>`,
      // so a `javascript:` value here is a stored XSS on the public product page.
      if (!image.startsWith("https://")) return true;
      try {
        const url = new URL(image);
        return !["http:", "https:"].includes(url.protocol);
      } catch {
        return true;
      }
    })
  ) {
    throw new ServiceError("INVALID", "Product images must be valid https URLs.");
  }
}

export async function listCategories(
  { activeOnly = true }: { activeOnly?: boolean } = {},
) {
  return categoriesRepo.listAll({ activeOnly });
}

export async function listServices(input: {
  userId: string;
  businessId: string;
}) {
  await requireOwnedBusiness(input.userId, input.businessId);
  return servicesRepo.listByBusiness(input.businessId);
}

export async function createService(input: {
  userId: string;
  businessId: string;
  data: ServiceData;
}) {
  await requireOwnedBusiness(input.userId, input.businessId);
  validateNameAndDescription(input.data);
  validateServicePrices(input.data);
  await requireCategory(input.data.categoryId);
  return servicesRepo.create({ ...input.data, businessId: input.businessId });
}

export async function updateService(input: {
  userId: string;
  businessId: string;
  serviceId: string;
  data: ServiceUpdateFields;
}) {
  await requireOwnedBusiness(input.userId, input.businessId);
  const existing = await servicesRepo.findById(input.serviceId);
  if (!existing || existing.business_id !== input.businessId) {
    throw new ServiceError("NOT_FOUND", "That service was not found.");
  }

  const name = input.data.name ?? existing.name;
  const description = input.data.description === undefined
    ? existing.description
    : input.data.description;
  const priceMin = input.data.priceMin === undefined
    ? existing.price_min
    : input.data.priceMin;
  const priceMax = input.data.priceMax === undefined
    ? existing.price_max
    : input.data.priceMax;

  validateNameAndDescription({ name, description });
  validateServicePrices({ priceMin, priceMax });
  await requireCategory(input.data.categoryId);

  const updated = await servicesRepo.update(input.serviceId, input.data);
  if (!updated) throw new ServiceError("NOT_FOUND", "That service was not found.");
  return updated;
}

export async function deleteService(input: {
  userId: string;
  businessId: string;
  serviceId: string;
}): Promise<void> {
  await requireOwnedBusiness(input.userId, input.businessId);
  const existing = await servicesRepo.findById(input.serviceId);
  if (!existing || existing.business_id !== input.businessId) {
    throw new ServiceError("NOT_FOUND", "That service was not found.");
  }
  await servicesRepo.deleteById(input.serviceId);
}

export async function listProducts(input: {
  userId: string;
  businessId: string;
}) {
  await requireOwnedBusiness(input.userId, input.businessId);
  return productsRepo.listByBusiness(input.businessId);
}

export async function createProduct(input: {
  userId: string;
  businessId: string;
  data: ProductData;
}) {
  await requireOwnedBusiness(input.userId, input.businessId);
  validateNameAndDescription(input.data);
  validateProduct(input.data);
  await requireCategory(input.data.categoryId);
  return productsRepo.create({ ...input.data, businessId: input.businessId });
}

export async function updateProduct(input: {
  userId: string;
  businessId: string;
  productId: string;
  data: ProductUpdateFields;
}) {
  await requireOwnedBusiness(input.userId, input.businessId);
  const existing = await productsRepo.findById(input.productId);
  if (!existing || existing.business_id !== input.businessId) {
    throw new ServiceError("NOT_FOUND", "That product was not found.");
  }

  validateNameAndDescription({
    name: input.data.name ?? existing.name,
    description: input.data.description === undefined
      ? existing.description
      : input.data.description,
  });
  validateProduct({
    price: input.data.price ?? existing.price,
    stock: input.data.stock === undefined ? existing.stock : input.data.stock,
    images: input.data.images ?? existing.images ?? [],
  });
  await requireCategory(input.data.categoryId);

  const updated = await productsRepo.update(input.productId, input.data);
  if (!updated) throw new ServiceError("NOT_FOUND", "That product was not found.");
  return updated;
}

export async function deleteProduct(input: {
  userId: string;
  businessId: string;
  productId: string;
}): Promise<void> {
  await requireOwnedBusiness(input.userId, input.businessId);
  const existing = await productsRepo.findById(input.productId);
  if (!existing || existing.business_id !== input.businessId) {
    throw new ServiceError("NOT_FOUND", "That product was not found.");
  }
  await productsRepo.deleteById(input.productId);
}