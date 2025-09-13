using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace KafkaInspector.Server
{
    public class RoutePrefixConvention : IApplicationModelConvention
    {
        private readonly AttributeRouteModel _routePrefix;

        public RoutePrefixConvention(string prefix)
        {
            _routePrefix = new AttributeRouteModel(new Microsoft.AspNetCore.Mvc.RouteAttribute(prefix));
        }

        public void Apply(ApplicationModel application)
        {
            foreach (var controller in application.Controllers)
            {
                // Skip controllers with explicit route
                if (controller.Selectors.Any(s => s.AttributeRouteModel != null))
                {
                    foreach (var selector in controller.Selectors.Where(s => s.AttributeRouteModel != null))
                    {
                        selector.AttributeRouteModel = AttributeRouteModel.CombineAttributeRouteModel(_routePrefix, selector.AttributeRouteModel);
                    }
                }
                else
                {
                    controller.Selectors.Add(new SelectorModel
                    {
                        AttributeRouteModel = _routePrefix
                    });
                }
            }
        }
    }
}
