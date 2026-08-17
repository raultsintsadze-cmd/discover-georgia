import { placeService } from "@/lib/services/impl/PlaceService";
import { AdminPlacesTable } from "@/components/admin/AdminPlacesTable";

export default async function AdminPlacesPage() {
  const places = await placeService.adminList();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">
        Create, edit, and delete destinations. Coordinates are always entered directly — never guessed.
      </p>
      <AdminPlacesTable initialPlaces={places} />
    </div>
  );
}
