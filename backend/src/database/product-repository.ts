import { ObjectId, type Collection, type Db } from "mongodb";

import type {
  ProductDocument,
  ProductVersionDocument,
} from "../models/persistence.js";

export interface ActiveProductVersion {
  product: ProductDocument;
  version: ProductVersionDocument;
}

export interface ProductStore {
  listActive(at: Date): Promise<ActiveProductVersion[]>;
  findActiveById(id: string, at: Date): Promise<ActiveProductVersion | null>;
}

export class ProductRepository implements ProductStore {
  private readonly products: Collection<ProductDocument>;
  private readonly versions: Collection<ProductVersionDocument>;

  constructor(db: Db) {
    this.products = db.collection<ProductDocument>("products");
    this.versions = db.collection<ProductVersionDocument>("productVersions");
  }

  async listActive(at: Date): Promise<ActiveProductVersion[]> {
    const products = await this.products
      .find({ active: true })
      .sort({ name: 1, _id: 1 })
      .toArray();
    if (!products.length) return [];

    const versions = await this.versions
      .find({
        productId: { $in: products.map(({ _id }) => _id) },
        effectiveFrom: { $lte: at },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gt: at } }],
      })
      .sort({ productId: 1, effectiveFrom: -1 })
      .toArray();
    const currentByProduct = new Map<string, ProductVersionDocument>();
    for (const version of versions) {
      const key = version.productId.toHexString();
      if (!currentByProduct.has(key)) currentByProduct.set(key, version);
    }
    return products.flatMap((product) => {
      const version = currentByProduct.get(product._id.toHexString());
      return version ? [{ product, version }] : [];
    });
  }

  async findActiveById(
    id: string,
    at: Date,
  ): Promise<ActiveProductVersion | null> {
    if (!ObjectId.isValid(id)) return null;
    const product = await this.products.findOne({
      _id: new ObjectId(id),
      active: true,
    });
    if (!product) return null;
    const version = await this.versions.findOne(
      {
        productId: product._id,
        effectiveFrom: { $lte: at },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gt: at } }],
      },
      { sort: { effectiveFrom: -1 } },
    );
    return version ? { product, version } : null;
  }
}
