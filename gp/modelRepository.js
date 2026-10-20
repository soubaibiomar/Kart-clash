class ModelRepository {
  static async refresh(bank=APEX_DRIVER_MODELS,fetcher=fetch){
    const read=async path=>{const response=await fetcher(path,{cache:'no-store'});if(!response.ok)throw new Error('Impossible de lire les modèles sauvegardés.');return response.json();};
    const manifest=await read('gp/models/manifest.json');
    if(manifest.schema!=='apex-bank-v1'||!Array.isArray(manifest.models)||!manifest.models.length)throw new Error('Invalid model manifest');
    const seen=new Set();for(const entry of manifest.models){if(!Number.isInteger(entry.driverId)||entry.driverId<0||entry.driverId>=22||seen.has(entry.driverId)||!/^driver-\d{2}\.json$/.test(entry.file))throw new Error('Invalid model manifest');seen.add(entry.driverId);}
    const records=await Promise.all(manifest.models.map(async entry=>{const record=await read('gp/models/'+entry.file);new DriverNeuralModel(record);if(record.driverId!==entry.driverId||record.metadata?.modelId!==entry.modelId)throw new Error('Model identity mismatch');return record;}));
    bank.models=records;return records;
  }
}
