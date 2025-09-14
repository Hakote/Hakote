import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("Utility functions", () => {
  describe("cn", () => {
    it("should combine class names", () => {
      const result = cn("class1", "class2", "class3");
      expect(result).toBe("class1 class2 class3");
    });

    it("should handle conditional classes", () => {
      const result = cn("base", true && "conditional", false && "hidden");
      expect(result).toBe("base conditional");
    });

    it("should handle undefined and null values", () => {
      const result = cn("base", undefined, null, "visible");
      expect(result).toBe("base visible");
    });

    it("should handle empty strings", () => {
      const result = cn("base", "", "visible");
      expect(result).toBe("base visible");
    });

    it("should handle mixed types", () => {
      const result = cn(
        "base",
        "class1",
        true && "class2",
        false && "class3",
        ""
      );
      expect(result).toBe("base class1 class2");
    });

    it("should handle single class", () => {
      const result = cn("single");
      expect(result).toBe("single");
    });

    it("should handle no arguments", () => {
      const result = cn();
      expect(result).toBe("");
    });
  });
});
