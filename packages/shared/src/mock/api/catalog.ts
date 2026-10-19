import type { CatalogApi } from '../../api/contracts';
import { ApiError } from '../../api/errors';
import { toMs } from '../../domain/time';
import { areas, areasInGovernorate, governorates } from '../../geo/kuwait';
import { searchScore } from '../../text/search';
import { findCategory, findService, findTechnician, type MockContext } from './context';
import type { Runner } from './runner';
import { reviewView, technicianSummary } from './views';

export function createCatalogApi(ctx: MockContext, run: Runner): CatalogApi {
  const activeCategories = () =>
    ctx.state.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const activeCategoryIds = () => new Set(activeCategories().map((c) => c.id));
  const activeServices = () => {
    const ids = activeCategoryIds();
    return ctx.state.services.filter((s) => s.isActive && ids.has(s.categoryId));
  };

  return {
    listCategories: () => run.read(activeCategories),

    getCategory: (id) =>
      run.read(() => {
        const category = findCategory(ctx, id);
        if (!category.isActive) throw new ApiError('NOT_FOUND', 'Category not found.');
        return category;
      }),

    listServices: (filter = {}) =>
      run.read(() =>
        activeServices()
          .filter((s) => (filter.categoryId ? s.categoryId === filter.categoryId : true))
          .filter((s) => (filter.popular ? s.isPopular : true))
          .sort(
            (a, b) =>
              Number(b.isPopular) - Number(a.isPopular) || b.bookingsCount - a.bookingsCount,
          ),
      ),

    getService: (id) =>
      run.read(() => {
        const service = findService(ctx, id);
        if (!service.isActive || !activeCategoryIds().has(service.categoryId)) {
          throw new ApiError('NOT_FOUND', 'Service not found.');
        }
        return service;
      }),

    search: (query) =>
      run.read(() => {
        const categories = activeCategories();
        const categoryName = new Map(categories.map((c) => [c.id, c.name]));
        const services = activeServices()
          .map((s) => {
            const cat = categoryName.get(s.categoryId);
            const score = searchScore(query, [
              `${s.name.en} ${s.name.ar}`,
              `${cat?.en ?? ''} ${cat?.ar ?? ''}`,
              `${s.shortDescription.en} ${s.shortDescription.ar}`,
            ]);
            return { s, score };
          })
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score || b.s.bookingsCount - a.s.bookingsCount)
          .map((r) => r.s);
        const matchedCategories = categories.filter(
          (c) =>
            searchScore(query, [
              `${c.name.en} ${c.name.ar}`,
              `${c.description.en} ${c.description.ar}`,
            ]) > 0,
        );
        return { services, categories: matchedCategories };
      }),

    listPromotions: () =>
      run.read(() => ctx.state.promotions.filter((p) => toMs(p.validUntil) > ctx.now())),

    listGovernorates: () => run.read(() => governorates),

    listAreas: (governorateId) =>
      run.read(() =>
        (governorateId ? areasInGovernorate(governorateId) : areas)
          .slice()
          .sort((a, b) => a.name.en.localeCompare(b.name.en)),
      ),

    listServiceReviews: (serviceId, limit = 10) =>
      run.read(() =>
        ctx.state.reviews
          .filter((r) => r.serviceId === serviceId && r.status === 'published' && r.comment.trim())
          .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
          .slice(0, limit)
          .map((r) => reviewView(ctx, r)),
      ),

    getTechnician: (id) =>
      run.read(() => {
        const technician = findTechnician(ctx, id);
        if (technician.status !== 'active')
          throw new ApiError('NOT_FOUND', 'Technician not found.');
        return technicianSummary(ctx, technician);
      }),
  };
}
