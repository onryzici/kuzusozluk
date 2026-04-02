import { describe, it, expect } from "vitest";
import { toSlug } from "@/lib/utils/slug";

describe("toSlug", () => {
  it("Türkçe karakterleri dönüştürür", () => {
    expect(toSlug("Çağrı Şener")).toBe("cagri-sener");
    expect(toSlug("Göğüs Üstü")).toBe("gogus-ustu");
    expect(toSlug("ışık")).toBe("isik");
  });

  it("boşlukları tire yapar", () => {
    expect(toSlug("merhaba dünya")).toBe("merhaba-dunya");
  });

  it("özel karakterleri kaldırır", () => {
    expect(toSlug("test!@#$%")).toBe("test");
  });

  it("çoklu tireleri birleştirir", () => {
    expect(toSlug("bir  iki   üç")).toBe("bir-iki-uc");
  });

  it("baş ve sondaki tireleri kaldırır", () => {
    expect(toSlug(" test ")).toBe("test");
  });
});
