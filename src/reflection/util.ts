export namespace util {
  export const deduplicate = (args: string[]) => [...new Set(args)];

  export const getFromArrayMap = <T>(map: Record<string, T[]>, id: string) => {
    return map[id] || [];
  };
  type PropertyDef = {
    configurable?: boolean;
    enumerable?: boolean;
    writable?: boolean;
    value?: any;
    set?: (v: any) => any;
    get?: () => any;
  };

  export const defineProperty = <T>(
    obj: T,
    name: string,
    def: PropertyDef & ThisType<T>
  ): T => {
    return Object.defineProperty(obj, name, def) as any;
  };

  export const defineMethod = <
    T
    // Def extends PropertyDef<T, P>
  >(
    obj: T,
    name: string,
    method: (this: T) => any
  ): T => {
    (obj as any)[name] = method.bind(obj);
    return obj;
  };
}
