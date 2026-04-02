export default function EngellendiPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-red-600">hesabiniz engellendi</h1>
        <p className="text-sm text-muted-foreground">
          hesabiniz bir yonetici tarafindan engellenmi&#351;tir. bu kararin hatali
          oldugunu du&#351;unuyorsaniz lutfen yoneticilerle ileti&#351;ime gecin.
        </p>
      </div>
    </div>
  );
}
